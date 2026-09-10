"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { keccak256, toBytes } from "viem";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { type Contact, formatShortAddress, getContacts } from "@/lib/contacts";
import {
  prepareNativeTransfer,
  type PreparedNativeTransfer,
} from "@/lib/transactionBuilder";

import {
  GUARDIAN_ABI,
  GUARDIAN_CHAIN_ID,
  GUARDIAN_CONTRACT_ADDRESS,
  RISK_LEVEL_TO_UINT,
} from "../lib/guardianContract";

import { saveAssessmentHistoryRecord } from "@/lib/historyStorage";
import { wagmiConfig } from "@/lib/wagmi";

type RiskAssessment = {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  score: number;
  summary: string;
  reasons: string[];
  recommendation: string;
};

type AssessmentTransactionStatus =
  | "idle"
  | "pending"
  | "confirmed"
  | "failed";

function isRiskAssessment(value: unknown): value is RiskAssessment {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const assessment = value as Partial<RiskAssessment>;

  return (
    (assessment.riskLevel === "LOW" ||
      assessment.riskLevel === "MEDIUM" ||
      assessment.riskLevel === "HIGH") &&
    typeof assessment.score === "number" &&
    Number.isFinite(assessment.score) &&
    typeof assessment.summary === "string" &&
    Array.isArray(assessment.reasons) &&
    assessment.reasons.every((reason) => typeof reason === "string") &&
    typeof assessment.recommendation === "string"
  );
}

function getApiErrorMessage(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return "Risk analysis failed. Please try again.";
  }

  const response = value as {
    error?: unknown;
  };

  return typeof response.error === "string"
    ? response.error
    : "Risk analysis failed. Please try again.";
}

function getWalletErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "The assessment transaction failed. Please try again.";
  }

  const candidate = error as {
    name?: string;
    shortMessage?: string;
    message?: string;
    cause?: unknown;
  };

  const rawMessage = typeof candidate.message === "string"
    ? candidate.message
    : "";
  const shortMessage = typeof candidate.shortMessage === "string"
    ? candidate.shortMessage
    : "";

  const compactRawMessage = rawMessage
    .split("Request Arguments:")[0]
    .trim();
  const compactShortMessage = shortMessage
    .split("Request Arguments:")[0]
    .trim();

  const rejectionText = [
    candidate.name,
    compactShortMessage,
    compactRawMessage,
    typeof candidate.cause === "string"
      ? candidate.cause
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (
    /user rejected|rejected the request|transaction cancelled|cancelled by user/i.test(
      rejectionText,
    )
  ) {
    return "Transaction cancelled by user.";
  }

  if (compactShortMessage) {
    return compactShortMessage;
  }

  if (compactRawMessage && compactRawMessage.length <= 200) {
    return compactRawMessage;
  }

  return "The assessment transaction failed. Please try again.";
}

function getTransactionId(transaction: PreparedNativeTransfer) {
  return keccak256(
    toBytes(
      JSON.stringify({
        from: transaction.from,
        to: transaction.to,
        amountBnb: transaction.amountBnb,
        asset: transaction.asset,
        valueWei: transaction.valueWei.toString(),
        chainId: transaction.chainId,
        chainName: transaction.chainName,
      }),
    ),
  );
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function TransactionBuilder() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [recipient, setRecipient] = useState("");
  const [amountBnb, setAmountBnb] = useState("");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("manual");

  const [errors, setErrors] = useState<{
    from?: string;
    to?: string;
    amountBnb?: string;
  }>({});

  const [preview, setPreview] =
    useState<PreparedNativeTransfer>();

  const [hasSubmittedPreview, setHasSubmittedPreview] =
    useState(false);

  const [riskAssessment, setRiskAssessment] =
    useState<RiskAssessment>();

  const [riskError, setRiskError] = useState("");
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);

  const [recordError, setRecordError] = useState("");

  const [assessmentTransactionHash, setAssessmentTransactionHash] =
    useState<`0x${string}`>();
  const [assessmentTransactionStatus, setAssessmentTransactionStatus] =
    useState<AssessmentTransactionStatus>("idle");

  const {
    writeContract,
    reset: resetWriteContract,
    isPending: isRecordingAssessment,
    error: writeError,
  } = useWriteContract({
    config: wagmiConfig,
  });

  const {
    data: assessmentReceipt,
    isError: isConfirmationError,
    error: confirmationError,
  } = useWaitForTransactionReceipt({
    config: wagmiConfig,
    chainId: GUARDIAN_CHAIN_ID,
    hash: assessmentTransactionHash,
  });

  const currentAssessmentTransactionStatus =
    assessmentReceipt
      ? assessmentReceipt.status === "success"
        ? "confirmed"
        : "failed"
      : isConfirmationError
        ? "failed"
        : assessmentTransactionStatus;

  /**
   * Prevent the same confirmed assessment transaction
   * from being saved more than once.
   */
  const persistedAssessmentRef =
    useRef<Set<`0x${string}`>>(new Set());

  /**
   * Load saved contacts for the connected wallet.
   */
  useEffect(() => {
    if (!address || !isConnected) {
      return;
    }

    let cancelled = false;

    async function loadContacts() {
      try {
        const currentAddress = address;
        if (!currentAddress) {
          return;
        }

        const nextContacts = await getContacts(currentAddress);

        if (!cancelled) {
          setContacts(nextContacts);
          if (nextContacts.length === 0) {
            setSelectedContactId("manual");
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to load contacts:", error);
        }

        if (!cancelled) {
          setContacts([]);
          setSelectedContactId("manual");
        }
      }
    }

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  /**
   * Current configured chain name.
   */
  const chainName = useMemo(() => {
    const chain = wagmiConfig.chains.find(
      (configuredChain) => configuredChain.id === chainId,
    );

    return chain?.name ?? `Chain ID ${chainId}`;
  }, [chainId]);

  /**
   * Save the confirmed assessment to the backend.
   *
   * IMPORTANT:
   * This function is intentionally called only AFTER
   * the smart-contract transaction has been confirmed.
   *
   * That guarantees transactionHash is available and
   * satisfies the NOT NULL constraint of assessments.tx_hash.
   */
  const saveAssessmentToDatabase = useCallback(
    async (
      assessment: RiskAssessment,
      transaction: PreparedNativeTransfer,
      assessmentHash: `0x${string}`,
      blockNumber?: number,
    ) => {
      if (!address) {
        throw new Error("Wallet address is unavailable.");
      }

      const transactionId = getTransactionId(transaction);

      const response = await fetch(
        `${API_URL}/api/assessments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: address,

            chainId: transaction.chainId,

            transactionId,

            /**
             * This is the hash of the Web3Guardian
             * recordAssessment transaction.
             */
            transactionHash: assessmentHash,

            riskScore: assessment.score,

            riskLevel: assessment.riskLevel,

            summary: assessment.summary,

            findings: assessment.reasons.map((reason) => ({
              title: reason,
              severity: assessment.riskLevel,
            })),

            recommendations: [
              assessment.recommendation,
            ],

            blockNumber:
              blockNumber !== undefined
                ? blockNumber
                : null,

            analysis: {
              source: "gemini",

              transactionId,

              from: transaction.from,

              to: transaction.to,

              amountBnb: transaction.amountBnb,

              asset: transaction.asset,

              network: transaction.chainName,
            },
          }),
        },
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data));
      }

      return data;
    },
    [address],
  );

  /**
   * Once the smart-contract assessment transaction
   * is confirmed, persist the assessment.
   *
   * Two destinations:
   *
   * 1. Supabase backend
   * 2. Local history storage
   */
  useEffect(() => {
    if (
      currentAssessmentTransactionStatus !== "confirmed" ||
      !assessmentTransactionHash ||
      !address ||
      !riskAssessment ||
      !preview ||
      persistedAssessmentRef.current.has(
        assessmentTransactionHash,
      )
    ) {
      return;
    }

    const transactionHash = assessmentTransactionHash;

    const transactionId = getTransactionId(preview);

    const blockNumber =
      assessmentReceipt?.blockNumber !== undefined
        ? Number(assessmentReceipt.blockNumber)
        : undefined;

    /**
     * Mark as persisted immediately so the same hash
     * cannot accidentally be processed twice.
     */
    persistedAssessmentRef.current.add(transactionHash);

    /**
     * Save to backend database.
     */
    void saveAssessmentToDatabase(
      riskAssessment,
      preview,
      transactionHash,
      blockNumber,
    )
      .then(() => {
        /**
         * Save to local history as well.
         */
        saveAssessmentHistoryRecord({
          walletAddress: address,
          transactionId,
          riskLevel: riskAssessment.riskLevel,
          score: riskAssessment.score,
          transactionHash,
          timestamp: Math.floor(Date.now() / 1000),
          blockNumber,
        });

        setRecordError("");
      })
      .catch((error) => {
        console.error(
          "Failed to save confirmed assessment:",
          error,
        );

        setRecordError(
          error instanceof Error
            ? `Assessment was recorded on-chain, but saving history failed: ${error.message}`
            : "Assessment was recorded on-chain, but saving history failed.",
        );

        /**
         * Remove from the persisted set so the operation
         * can be retried if the component state changes.
         */
        persistedAssessmentRef.current.delete(
          transactionHash,
        );
      });
  }, [
    address,
    assessmentReceipt,
    assessmentTransactionHash,
    currentAssessmentTransactionStatus,
    preview,
    riskAssessment,
    saveAssessmentToDatabase,
  ]);

  /**
   * Contact selection.
   */
  function handleSelectContact(value: string) {
    if (value === "no-contacts" || value === "separator") {
      return;
    }

    setSelectedContactId(value);

    if (value === "manual") {
      return;
    }

    const selectedContact = contacts.find((contact) => contact.id === value);

    if (!selectedContact) {
      return;
    }

    setRecipient(selectedContact.address);
    setPreview(undefined);
    setHasSubmittedPreview(false);
    setRiskAssessment(undefined);
    setRiskError("");
    setErrors((currentErrors) => ({ ...currentErrors, to: undefined }));
  }
  /**
   * Prepare transaction preview.
   *
   * This does NOT send anything to the blockchain.
   */
  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setHasSubmittedPreview(true);

    const validation = prepareNativeTransfer({
      from: address,
      to: recipient,
      amountBnb,
      chainId,
      chainName,
    });

    setErrors(validation.errors);

    setPreview(validation.preparedTransaction);

    setRiskAssessment(undefined);

    setRiskError("");

    setRecordError("");

    setAssessmentTransactionHash(undefined);
    setAssessmentTransactionStatus("idle");

    resetWriteContract();
  }

  /**
   * Ask the backend / Gemini to analyze the transaction.
   *
   * IMPORTANT:
   * This function does NOT save anything to Supabase.
   *
   * The database save happens only after
   * Record Assessment is confirmed on-chain.
   */
  async function handleAnalyzeRisk() {
    if (!preview) {
      setRiskError(
        "Prepare a valid transaction review before analyzing risk.",
      );

      return;
    }

    setIsAnalyzingRisk(true);

    setRiskAssessment(undefined);

    setRiskError("");

    setRecordError("");

    setAssessmentTransactionHash(undefined);
    setAssessmentTransactionStatus("idle");

    resetWriteContract();

    try {
      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            from: preview.from,

            to: preview.to,

            amount: preview.amountBnb,

            asset: preview.asset,

            network: `${preview.chainName} (${preview.chainId})`,
          }),
        },
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        setRiskError(
          getApiErrorMessage(data),
        );

        return;
      }

      if (!isRiskAssessment(data)) {
        setRiskError(
          "Risk analysis returned an unexpected response.",
        );

        return;
      }

      /**
       * Only display the AI result here.
       *
       * DO NOT save to database yet.
       */
      setRiskAssessment(data);
    } catch {
      setRiskError(
        "Risk analysis request failed. Please try again.",
      );
    } finally {
      setIsAnalyzingRisk(false);
    }
  }

  /**
   * Record assessment on the Web3Guardian smart contract.
   */
  function handleRecordAssessment() {
    if (!riskAssessment || !preview) {
      setRecordError(
        "Complete a valid risk analysis before recording an assessment.",
      );

      return;
    }

    if (!isConnected) {
      setRecordError(
        "Connect your wallet before recording an assessment.",
      );

      return;
    }

    if (chainId !== GUARDIAN_CHAIN_ID) {
      setRecordError(
        "Switch your wallet to BNB Smart Chain Testnet (chain ID 97).",
      );

      return;
    }

    if (
      !Number.isInteger(riskAssessment.score) ||
      riskAssessment.score < 0 ||
      riskAssessment.score > 100
    ) {
      setRecordError(
        "The risk score must be a whole number between 0 and 100.",
      );

      return;
    }

    setRecordError("");

    resetWriteContract();

    setAssessmentTransactionHash(undefined);
    setAssessmentTransactionStatus("pending");

    writeContract(
      {
        address: GUARDIAN_CONTRACT_ADDRESS,

        abi: GUARDIAN_ABI,

        functionName: "recordAssessment",

        args: [
          getTransactionId(preview),

          RISK_LEVEL_TO_UINT[
          riskAssessment.riskLevel
          ],

          riskAssessment.score,
        ],

        chainId: GUARDIAN_CHAIN_ID,
      },

      {
        onSuccess: (hash) => {
          setAssessmentTransactionHash(hash);
          setAssessmentTransactionStatus("pending");

          setRecordError("");
        },

        onError: (error) => {
          setAssessmentTransactionStatus("failed");
          setRecordError(
            getWalletErrorMessage(error),
          );
        },
      },
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Transaction Builder
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Prepare a native BNB transfer for review. No signature or transaction will be sent.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:gap-5"
      >
        {/* CONTACT */}
        <div className="flex flex-col gap-2 text-sm">
          <label
            htmlFor="recipient-contact"
            className="font-medium text-muted"
          >
            Recipient
          </label>

          <select
            id="recipient-contact"
            value={selectedContactId}
            onChange={(event) => handleSelectContact(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          >
            <option value="manual">Enter address manually</option>

            {contacts.length === 0 ? (
              <option value="no-contacts" disabled>
                No saved contacts — add one in Contacts
              </option>
            ) : (
              <>
                <option value="separator" disabled>
                  ──────────────
                </option>

                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} — {formatShortAddress(contact.address)}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* RECIPIENT ADDRESS */}
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-muted">
            Recipient address
          </span>

          <input
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value);

              setSelectedContactId("manual");

              setPreview(undefined);

              setHasSubmittedPreview(false);

              setRiskAssessment(undefined);

              setRiskError("");

              setRecordError("");

              setErrors((currentErrors) => ({
                ...currentErrors,
                to: undefined,
              }));
            }}
            placeholder="0x..."
            className="rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          />

          {errors.to ? (
            <span className="text-xs text-red-400">
              {errors.to}
            </span>
          ) : null}
        </label>

        {/* AMOUNT */}
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-muted">
            Amount
          </span>

          <input
            value={amountBnb}
            onChange={(event) => {
              setAmountBnb(event.target.value);

              setPreview(undefined);

              setHasSubmittedPreview(false);

              setRiskAssessment(undefined);

              setRiskError("");

              setRecordError("");

              setErrors((currentErrors) => ({
                ...currentErrors,
                amountBnb: undefined,
              }));
            }}
            inputMode="decimal"
            placeholder="0.05"
            className="rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          />

          {errors.amountBnb ? (
            <span className="text-xs text-red-400">
              {errors.amountBnb}
            </span>
          ) : null}
        </label>

        {/* PREVIEW CTA */}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!isConnected}
            className="w-full rounded-lg border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-accent/20 hover:shadow-lg hover:shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none lg:w-auto"
          >
            Review Transaction →
          </button>
        </div>
      </form>

      {errors.from ? (
        <p className="mt-4 text-sm text-red-400">
          {errors.from}
        </p>
      ) : null}

      {/* WALLET AND NETWORK INFO */}
      <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background/50 p-4">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted">
            From
          </p>

          <p className="mt-2 break-all font-mono text-sm text-foreground">
            {isConnected && address
              ? address
              : "Connect wallet to use your address"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background/50 p-4">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted">
            Network
          </p>

          <p className="mt-2 font-mono text-sm text-foreground">
            {chainName}
          </p>
        </div>
      </div>

      {/* TRANSACTION REVIEW */}
      {hasSubmittedPreview ? (
        <div className="mt-6 space-y-5">
          {/* Review Header */}
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Transaction Review
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Verify the recipient and network before continuing.
                </p>
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                <p
                  className={[
                    "text-sm font-mono",
                    preview
                      ? "text-accent"
                      : "text-red-400",
                  ].join(" ")}
                >
                  {preview
                    ? "✓ Ready for analysis"
                    : "Invalid transaction data"}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void handleAnalyzeRisk()
                  }
                  disabled={
                    !preview ||
                    isAnalyzingRisk
                  }
                  className="rounded-lg border border-accent/40 bg-accent/10 px-5 py-2 text-sm font-semibold text-accent transition-all hover:bg-accent/20 hover:shadow-lg hover:shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                >
                  {isAnalyzingRisk
                    ? "Analyzing..."
                    : "Analyze Risk"}
                </button>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="rounded-lg border border-border bg-background/40 p-5">
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  From
                </dt>
                <dd className="mt-2 break-all font-mono text-foreground">
                  {preview?.from ??
                    "Unavailable"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  To
                </dt>
                <dd className="mt-2 break-all font-mono text-foreground">
                  {preview?.to ??
                    "Enter a valid recipient"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Amount
                </dt>
                <dd className="mt-2 font-mono text-foreground">
                  {preview
                    ? `${preview.amountBnb} BNB`
                    : "Enter an amount"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Asset
                </dt>
                <dd className="mt-2 font-mono text-foreground">
                  {preview?.asset ??
                    "native BNB"}
                </dd>
              </div>

              <div className="md:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Network
                </dt>
                <dd className="mt-2 font-mono text-foreground">
                  {preview
                    ? `${preview.chainName} (${preview.chainId})`
                    : chainName}
                </dd>
              </div>
            </dl>
          </div>

          {/* Risk Error */}
          {riskError ? (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4">
              <p className="text-sm text-red-400">
                {riskError}
              </p>
            </div>
          ) : null}

          {/* AI ASSESSMENT */}
          {riskAssessment ? (
            <div className="mt-6 rounded-lg border border-accent/30 bg-accent/5 p-5">
              {/* Header with Risk Score */}
              <div className="mb-5">
                <h3 className="text-base font-semibold text-foreground">
                  AI Risk Assessment
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Powered by Gemini AI analysis
                </p>
              </div>

              {/* Risk Score Highlight */}
              <div className="mb-5 flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Risk Level
                  </p>
                  <p className="mt-1.5 text-lg font-bold text-accent">
                    {riskAssessment.riskLevel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Risk Score
                  </p>
                  <p className="mt-1.5 text-3xl font-bold text-accent">
                    {riskAssessment.score}
                  </p>
                  <p className="text-xs text-muted">/100</p>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-4">
                <p className="text-sm leading-6 text-foreground">
                  {riskAssessment.summary}
                </p>
              </div>

              {/* Reasons */}
              {riskAssessment.reasons.length > 0 ? (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Key Findings
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {riskAssessment.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2 text-foreground">
                        <span className="flex-shrink-0 text-accent">
                          •
                        </span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Recommendation */}
              <div className="mb-4 rounded-lg border border-border bg-background/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Recommendation
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {riskAssessment.recommendation}
                </p>
              </div>

              <p className="text-xs leading-5 text-muted">
                This is an AI-assisted assessment, not a safety guarantee. Always verify transaction details carefully.
              </p>

              {/* RECORD ASSESSMENT SECTION */}
              <div className="mt-5 border-t border-border pt-5">
                <div className="mb-4">
                  <h4 className="font-semibold text-foreground">
                    Record Assessment
                  </h4>
                  <p className="mt-1 text-xs text-muted">
                    Save this assessment to the blockchain
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleRecordAssessment
                  }
                  disabled={
                    !isConnected ||
                    chainId !==
                    GUARDIAN_CHAIN_ID ||
                    isRecordingAssessment ||
                    currentAssessmentTransactionStatus === "pending" ||
                    currentAssessmentTransactionStatus === "confirmed"
                  }
                  className="w-full rounded-lg border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-accent/20 hover:shadow-lg hover:shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                >
                  {isRecordingAssessment
                    ? "Confirming in wallet..."
                    : currentAssessmentTransactionStatus === "pending"
                      ? "Recording on-chain..."
                      : currentAssessmentTransactionStatus === "confirmed"
                        ? "✓ Assessment recorded"
                        : "Record Assessment"}
                </button>

                {/* WALLET WARNINGS */}
                <div className="mt-3 space-y-2">
                  {!isConnected ? (
                    <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3">
                      <p className="text-xs text-red-400">
                        Connect your wallet to record this assessment.
                      </p>
                    </div>
                  ) : null}

                  {isConnected && chainId !== GUARDIAN_CHAIN_ID ? (
                    <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3">
                      <p className="text-xs text-red-400">
                        Switch to BNB Smart Chain Testnet (chain ID 97) to record this assessment.
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* TRANSACTION STATUS */}
                {currentAssessmentTransactionStatus === "confirmed" && assessmentTransactionHash ? (
                  <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent">
                      <span>✓</span>
                      <span>Assessment recorded on-chain</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-muted">Transaction hash:</p>
                        <p className="mt-1 break-all font-mono text-foreground">
                          {assessmentTransactionHash}
                        </p>
                      </div>

                      <a
                        href={`https://testnet.bscscan.com/tx/${assessmentTransactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent transition-colors hover:text-foreground"
                      >
                        View on BscScan →
                      </a>
                    </div>
                  </div>
                ) : null}

                {/* PENDING STATE */}
                {currentAssessmentTransactionStatus === "pending" && assessmentTransactionHash ? (
                  <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
                    <p className="flex items-center gap-2 text-sm text-foreground">
                      <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
                      Recording assessment on-chain...
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-muted">
                      {assessmentTransactionHash}
                    </p>
                  </div>
                ) : null}

                {/* ERROR STATE */}
                {(recordError ||
                  writeError ||
                  isConfirmationError ||
                  currentAssessmentTransactionStatus === "failed") ? (
                  <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-4">
                    <p className="text-xs text-red-400">
                      {recordError ||
                        getWalletErrorMessage(
                          writeError ??
                          confirmationError,
                        )}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}