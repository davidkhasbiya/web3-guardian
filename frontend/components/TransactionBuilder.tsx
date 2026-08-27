"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import {
  prepareNativeTransfer,
  type PreparedNativeTransfer,
} from "@/lib/transactionBuilder";
import { wagmiConfig } from "@/lib/wagmi";

type RiskAssessment = {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  score: number;
  summary: string;
  reasons: string[];
  recommendation: string;
};

function isRiskAssessment(value: unknown): value is RiskAssessment {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
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
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "Risk analysis failed. Please try again.";
  }

  const response = value as { error?: unknown };
  return typeof response.error === "string" ? response.error : "Risk analysis failed. Please try again.";
}

export default function TransactionBuilder() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [recipient, setRecipient] = useState("");
  const [amountBnb, setAmountBnb] = useState("");
  const [errors, setErrors] = useState<{
    from?: string;
    to?: string;
    amountBnb?: string;
  }>({});
  const [preview, setPreview] = useState<PreparedNativeTransfer>();
  const [hasSubmittedPreview, setHasSubmittedPreview] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment>();
  const [riskError, setRiskError] = useState("");
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);

  const chainName = useMemo(() => {
    const chain = wagmiConfig.chains.find((configuredChain) => configuredChain.id === chainId);
    return chain?.name ?? `Chain ID ${chainId}`;
  }, [chainId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
  }

  async function handleAnalyzeRisk() {
    if (!preview) {
      setRiskError("Prepare a valid transaction review before analyzing risk.");
      return;
    }

    setIsAnalyzingRisk(true);
    setRiskAssessment(undefined);
    setRiskError("");

    try {
      const response = await fetch("/api/analyze", {
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
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setRiskError(getApiErrorMessage(data));
        return;
      }

      if (!isRiskAssessment(data)) {
        setRiskError("Risk analysis returned an unexpected response.");
        return;
      }

      setRiskAssessment(data);
    } catch {
      setRiskError("Risk analysis request failed. Please try again.");
    } finally {
      setIsAnalyzingRisk(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="mb-5">
        <p className="text-sm text-muted">Transaction Builder</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          Prepare native BNB transfer
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Build a transfer preview for review. This does not request a signature or send a
          transaction.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-muted">Recipient address</span>
          <input
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value);
              setPreview(undefined);
              setHasSubmittedPreview(false);
              setRiskAssessment(undefined);
              setRiskError("");
              setErrors((currentErrors) => ({ ...currentErrors, to: undefined }));
            }}
            placeholder="0x..."
            className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none placeholder:text-muted/50 focus:border-accent/60"
          />
          {errors.to ? <span className="text-xs text-red-400">{errors.to}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-muted">Amount in BNB</span>
          <input
            value={amountBnb}
            onChange={(event) => {
              setAmountBnb(event.target.value);
              setPreview(undefined);
              setHasSubmittedPreview(false);
              setRiskAssessment(undefined);
              setRiskError("");
              setErrors((currentErrors) => ({ ...currentErrors, amountBnb: undefined }));
            }}
            inputMode="decimal"
            placeholder="0.05"
            className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none placeholder:text-muted/50 focus:border-accent/60"
          />
          {errors.amountBnb ? (
            <span className="text-xs text-red-400">{errors.amountBnb}</span>
          ) : null}
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={!isConnected}
            className="w-full rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
          >
            Preview
          </button>
        </div>
      </form>

      {errors.from ? <p className="mt-3 text-sm text-red-400">{errors.from}</p> : null}

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background/60 p-4">
          <p className="text-muted">From</p>
          <p className="mt-2 break-all font-mono text-foreground">
            {isConnected && address ? address : "Connect wallet to use your address"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background/60 p-4">
          <p className="text-muted">Current network</p>
          <p className="mt-2 font-mono text-foreground">{chainName}</p>
        </div>
      </div>

      {hasSubmittedPreview ? (
        <div className="mt-5 rounded-lg border border-accent/30 bg-accent/5 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-accent">Transaction Review</p>
            <div className="flex flex-col gap-2 md:items-end">
              <p
                className={
                  preview
                    ? "font-mono text-sm text-accent"
                    : "font-mono text-sm text-red-400"
                }
              >
                {preview ? "Ready for security analysis" : "Invalid transaction data"}
              </p>
              <button
                type="button"
                onClick={() => void handleAnalyzeRisk()}
                disabled={!preview || isAnalyzingRisk}
                className="rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzingRisk ? "Analyzing..." : "Analyze Risk"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            This review is only a preview. No transaction has been sent, signed, or
            submitted.
          </p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted">From address</dt>
              <dd className="mt-1 break-all font-mono">
                {preview?.from ?? "Unavailable until valid"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Recipient address</dt>
              <dd className="mt-1 break-all font-mono">
                {preview?.to ?? "Enter a valid recipient"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Amount</dt>
              <dd className="mt-1 font-mono">
                {preview ? `${preview.amountBnb} BNB` : "Enter a valid positive amount"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Asset</dt>
              <dd className="mt-1 font-mono">{preview?.asset ?? "native BNB"}</dd>
            </div>
            <div>
              <dt className="text-muted">Network</dt>
              <dd className="mt-1 font-mono">
                {preview ? `${preview.chainName} (${preview.chainId})` : chainName}
              </dd>
            </div>
          </dl>

          {riskError ? <p className="mt-4 text-sm text-red-400">{riskError}</p> : null}

          {riskAssessment ? (
            <div className="mt-5 rounded-lg border border-border bg-background/60 p-4">
              <p className="text-sm font-medium text-accent">
                AI-assisted risk assessment
              </p>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-muted">Risk level</p>
                  <p className="mt-1 font-mono text-foreground">
                    {riskAssessment.riskLevel}
                  </p>
                </div>
                <div>
                  <p className="text-muted">Risk score</p>
                  <p className="mt-1 font-mono text-foreground">
                    {riskAssessment.score}/100
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">
                {riskAssessment.summary}
              </p>
              <div className="mt-4">
                <p className="text-sm text-muted">Reasons</p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">
                  {riskAssessment.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted">Recommendation</p>
                <p className="mt-2 text-sm leading-6">
                  {riskAssessment.recommendation}
                </p>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted">
                This is an AI-assisted assessment, not a safety guarantee. No
                transaction signing or sending has been requested.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
