"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { GUARDIAN_CHAIN_ID } from "@/lib/guardianContract";

type ApiAssessment = {
    id: string;
    wallet_address: string;
    transaction_id: string | null;
    risk_level: "LOW" | "MEDIUM" | "HIGH" | null;
    risk_score: number | null;
    ai_summary: string | null;
    ai_reasons: unknown;
    recommendation: string | null;
    tx_hash: string | null;
    block_number: number | null;
    chain_id: number;
    created_at: string;
    analysis: unknown;
};

type AssessmentHistory = {
    id: string;
    transactionHash: string | null;
    transactionId: string | null;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    score: number;
    timestamp: number;
    blockNumber: number | null;
    summary: string | null;
    recommendation: string | null;
};

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function shortHash(hash: string) {
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function formatTimestamp(timestamp: string) {
    return new Date(timestamp).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function mapAssessment(record: ApiAssessment): AssessmentHistory {
    const analysis =
        typeof record.analysis === "object" && record.analysis !== null
            ? (record.analysis as { transactionId?: string | null })
            : null;

    const resolvedTransactionId =
        typeof record.transaction_id === "string" &&
            record.transaction_id.trim() !== "" &&
            record.transaction_id !== "unknown"
            ? record.transaction_id
            : typeof analysis?.transactionId === "string" &&
                analysis.transactionId.trim() !== ""
                ? analysis.transactionId
                : record.transaction_id;

    return {
        id: record.id,
        transactionHash: record.tx_hash,
        transactionId: resolvedTransactionId,
        riskLevel: record.risk_level ?? "LOW",
        score: record.risk_score ?? 0,
        timestamp: new Date(record.created_at).getTime(),
        blockNumber: record.block_number,
        summary: record.ai_summary,
        recommendation: record.recommendation,
    };
}

export default function HistoryPage() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();

    const [history, setHistory] = useState<AssessmentHistory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const requestRef = useRef(0);

    useEffect(() => {
        if (!isConnected || !address || chainId !== GUARDIAN_CHAIN_ID) {
            return;
        }

        const currentWalletAddress = address;

        const requestId = requestRef.current + 1;
        requestRef.current = requestId;

        const controller = new AbortController();

        async function loadHistory() {
            setIsLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `${API_URL}/api/assessments?walletAddress=${encodeURIComponent(currentWalletAddress)}`,
                    {
                        signal: controller.signal,
                    },
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        typeof data?.error === "string"
                            ? data.error
                            : "Failed to load assessment history.",
                    );
                }

                if (requestId !== requestRef.current) {
                    return;
                }

                const records = Array.isArray(data)
                    ? data.map(mapAssessment)
                    : [];

                setHistory(records);
            } catch (loadError) {
                if (
                    controller.signal.aborted ||
                    requestId !== requestRef.current
                ) {
                    return;
                }

                console.error(loadError);
                setError("Unable to load assessment history.");
            } finally {
                if (
                    !controller.signal.aborted &&
                    requestId === requestRef.current
                ) {
                    setIsLoading(false);
                }
            }
        }

        void loadHistory();

        return () => {
            controller.abort();
        };
    }, [address, chainId, isConnected]);

    const showWalletPrompt = !isConnected || !address;

    const showNetworkPrompt =
        isConnected &&
        Boolean(address) &&
        chainId !== GUARDIAN_CHAIN_ID;

    const showLoading =
        !showWalletPrompt && !showNetworkPrompt && isLoading;

    const showError =
        !showWalletPrompt &&
        !showNetworkPrompt &&
        !isLoading &&
        Boolean(error);

    const showEmpty =
        !showWalletPrompt &&
        !showNetworkPrompt &&
        !isLoading &&
        !error &&
        history.length === 0;

    const showHistory =
        !showWalletPrompt &&
        !showNetworkPrompt &&
        !isLoading &&
        !error &&
        history.length > 0;

    return (
        <div className="min-h-full">
            <Header />

            <main className="mx-auto max-w-6xl px-6 py-8">
                <div className="flex flex-col gap-6 md:flex-row">
                    <Sidebar />

                    <section className="min-w-0 flex-1">
                        <div className="rounded-xl border border-border bg-card p-5">
                            <p className="text-sm text-muted">
                                Assessment History
                            </p>

                            <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                                <div>
                                    <h1 className="text-2xl font-semibold tracking-tight">
                                        Recorded reviews
                                    </h1>

                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                                        Your AI-assisted security assessments
                                        saved to Web3 Guardian.
                                    </p>
                                </div>

                                {isConnected && !showNetworkPrompt && (
                                    <div className="rounded-full border border-border px-3 py-1.5 text-xs text-muted">
                                        {history.length}{" "}
                                        {history.length === 1
                                            ? "assessment"
                                            : "assessments"}
                                    </div>
                                )}
                            </div>
                        </div>

                        {showWalletPrompt ? (
                            <div className="mt-5 rounded-xl border border-border bg-card p-8 text-center">
                                <p className="text-sm font-medium">
                                    Connect your wallet to view history
                                </p>

                                <p className="mt-2 text-sm text-muted">
                                    Your recorded assessments are linked to
                                    your wallet address.
                                </p>
                            </div>
                        ) : showNetworkPrompt ? (
                            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                                <p className="text-sm font-medium text-red-400">
                                    Wrong network
                                </p>

                                <p className="mt-2 text-sm leading-6 text-muted">
                                    Switch your wallet to BNB Smart Chain
                                    Testnet (chain ID 97) to view assessment
                                    history.
                                </p>
                            </div>
                        ) : showLoading ? (
                            <div className="mt-5 rounded-xl border border-border bg-card p-8 text-center">
                                <p className="text-sm text-muted">
                                    Loading assessment history...
                                </p>
                            </div>
                        ) : showError ? (
                            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                                <p className="text-sm font-medium text-red-400">
                                    Could not load history
                                </p>

                                <p className="mt-2 text-sm leading-6 text-muted">
                                    {error}
                                </p>
                            </div>
                        ) : showEmpty ? (
                            <div className="mt-5 rounded-xl border border-border bg-card p-8 text-center">
                                <p className="text-sm font-medium">
                                    No assessments recorded yet
                                </p>

                                <p className="mt-2 text-sm leading-6 text-muted">
                                    Analyze a transaction and save its
                                    assessment to see it appear here.
                                </p>
                            </div>
                        ) : showHistory ? (
                            <div className="mt-5 space-y-4">
                                {history.map((assessment) => (
                                    <article
                                        key={assessment.id}
                                        className="rounded-xl border border-border bg-card p-5"
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${assessment.riskLevel ===
                                                            "HIGH"
                                                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                                                            : assessment.riskLevel ===
                                                                "MEDIUM"
                                                                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                                                                : "border-accent/30 bg-accent/10 text-accent"
                                                            }`}
                                                    >
                                                        {assessment.riskLevel}
                                                    </span>

                                                    <span className="text-sm text-muted">
                                                        Risk score:{" "}
                                                        <span className="font-medium text-foreground">
                                                            {assessment.score}
                                                            /100
                                                        </span>
                                                    </span>
                                                </div>

                                                {assessment.summary ? (
                                                    <p className="mt-4 text-sm leading-6 text-muted">
                                                        {assessment.summary}
                                                    </p>
                                                ) : null}

                                                {assessment.transactionId ? (
                                                    <>
                                                        <p className="mt-4 text-xs text-muted">
                                                            Transaction ID
                                                        </p>

                                                        <p className="mt-1 break-all font-mono text-sm">
                                                            {
                                                                assessment.transactionId
                                                            }
                                                        </p>
                                                    </>
                                                ) : null}
                                            </div>

                                            <div className="shrink-0 text-left sm:text-right">
                                                <p className="text-xs text-muted">
                                                    Recorded
                                                </p>

                                                <p className="mt-1 text-sm">
                                                    {formatTimestamp(
                                                        new Date(
                                                            assessment.timestamp,
                                                        ).toISOString(),
                                                    )}
                                                </p>

                                                {assessment.blockNumber !==
                                                    null ? (
                                                    <p className="mt-2 text-xs text-muted">
                                                        Block #
                                                        {
                                                            assessment.blockNumber
                                                        }
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>

                                        {assessment.recommendation ? (
                                            <div className="mt-5 border-t border-border pt-4">
                                                <p className="text-xs text-muted">
                                                    Recommendation
                                                </p>

                                                <p className="mt-2 text-sm leading-6">
                                                    {
                                                        assessment.recommendation
                                                    }
                                                </p>
                                            </div>
                                        ) : null}

                                        {assessment.transactionHash ? (
                                            <div className="mt-5 border-t border-border pt-4">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <a
                                                            href={`https://testnet.bscscan.com/tx/${assessment.transactionHash}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-sm font-medium text-accent hover:underline"
                                                        >
                                                            View transaction ↗
                                                        </a>

                                                        <span className="font-mono text-xs text-muted">
                                                            {shortHash(
                                                                assessment.transactionHash,
                                                            )}
                                                        </span>
                                                    </div>

                                                    <span className="break-all font-mono text-xs text-muted">
                                                        Tx hash:{" "}
                                                        {
                                                            assessment.transactionHash
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null}
                                    </article>
                                ))}
                            </div>
                        ) : null}
                    </section>
                </div>
            </main>
        </div>
    );
}