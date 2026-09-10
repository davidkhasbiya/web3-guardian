"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

function getRiskColor(level: "LOW" | "MEDIUM" | "HIGH") {
    switch (level) {
        case "HIGH":
            return "border-red-500/30 bg-red-500/10 text-red-400";
        case "MEDIUM":
            return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
        default:
            return "border-accent/30 bg-accent/10 text-accent";
    }
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

function StatCard({
    label,
    value,
    description,
}: {
    label: string;
    value: string | number;
    description?: string;
}) {
    return (
        <article className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
                {label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {value}
            </p>
            {description && (
                <p className="mt-2 text-xs text-muted">{description}</p>
            )}
        </article>
    );
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

    // Calculate statistics
    const totalAssessments = history.length;
    const lowRiskCount = history.filter(
        (a) => a.riskLevel === "LOW"
    ).length;
    const mediumRiskCount = history.filter(
        (a) => a.riskLevel === "MEDIUM"
    ).length;
    const highRiskCount = history.filter(
        (a) => a.riskLevel === "HIGH"
    ).length;

    return (
        <div className="min-h-full">
            <Header />

            <main className="w-full px-5 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-6 md:flex-row">
                    <Sidebar />

                    <div className="min-w-0 flex-1">
                        {/* Page Header */}
                        <section className="mb-8">
                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent-dim">
                                Assessment History
                            </p>
                            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                                <div>
                                    <h1 className="text-3xl font-semibold tracking-tight">
                                        Security Assessment History
                                    </h1>
                                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                                        Review previous AI-assisted transaction risk
                                        assessments recorded by Web3 Guardian.
                                    </p>
                                </div>
                                {showHistory && (
                                    <div className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted">
                                        {totalAssessments}{" "}
                                        {totalAssessments === 1
                                            ? "assessment"
                                            : "assessments"}
                                    </div>
                                )}
                            </div>
                        </section>

                        {showWalletPrompt ? (
                            <div className="rounded-xl border border-border bg-card p-8 text-center">
                                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card/50">
                                    <span className="text-xl">🔌</span>
                                </div>
                                <p className="mt-4 font-medium">
                                    Connect your wallet
                                </p>
                                <p className="mt-2 text-sm leading-6 text-muted">
                                    Your recorded assessments are linked to your
                                    wallet address. Connect to view your
                                    assessment history.
                                </p>
                            </div>
                        ) : showNetworkPrompt ? (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="mt-0.5 text-xl">⚠️</div>
                                    <div>
                                        <p className="font-medium text-red-400">
                                            Wrong network
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-muted">
                                            Switch to BNB Smart Chain Testnet
                                            (chain ID 97) to view your
                                            assessment history.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : showLoading ? (
                            <div className="space-y-4">
                                <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
                                <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
                                <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
                            </div>
                        ) : showError ? (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="mt-0.5 text-xl">❌</div>
                                    <div>
                                        <p className="font-medium text-red-400">
                                            Could not load history
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-muted">
                                            {error}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : showEmpty ? (
                            <div className="rounded-xl border border-border bg-card p-8 text-center">
                                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card/50">
                                    <span className="text-xl">📋</span>
                                </div>
                                <p className="mt-4 font-medium">
                                    No assessments yet
                                </p>
                                <p className="mt-2 text-sm leading-6 text-muted">
                                    Assessments will appear here after you
                                    analyze and record transaction risk
                                    assessments.
                                </p>
                                <Link
                                    href="/analyze"
                                    className="mt-4 inline-block rounded-lg border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
                                >
                                    Go to Risk Analyzer →
                                </Link>
                            </div>
                        ) : showHistory ? (
                            <div className="space-y-6">
                                {/* Summary Cards */}
                                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <StatCard
                                        label="Total Assessments"
                                        value={totalAssessments}
                                    />
                                    <StatCard
                                        label="Low Risk"
                                        value={lowRiskCount}
                                        description={
                                            totalAssessments > 0
                                                ? `${Math.round((lowRiskCount / totalAssessments) * 100)}%`
                                                : "0%"
                                        }
                                    />
                                    <StatCard
                                        label="Medium Risk"
                                        value={mediumRiskCount}
                                        description={
                                            totalAssessments > 0
                                                ? `${Math.round((mediumRiskCount / totalAssessments) * 100)}%`
                                                : "0%"
                                        }
                                    />
                                    <StatCard
                                        label="High Risk"
                                        value={highRiskCount}
                                        description={
                                            totalAssessments > 0
                                                ? `${Math.round((highRiskCount / totalAssessments) * 100)}%`
                                                : "0%"
                                        }
                                    />
                                </section>

                                {/* Recent Assessments */}
                                <section>
                                    <h2 className="mb-4 text-lg font-semibold">
                                        Recent Assessments
                                    </h2>
                                    <div className="space-y-4">
                                        {history.map((assessment) => (
                                            <article
                                                key={assessment.id}
                                                className="overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-accent/50"
                                            >
                                                {/* Risk badge and score row */}
                                                <div className="border-b border-border bg-card/50 px-6 py-4">
                                                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <span
                                                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskColor(assessment.riskLevel)}`}
                                                            >
                                                                {assessment.riskLevel}
                                                            </span>
                                                            <span className="text-sm font-medium text-foreground">
                                                                Score:{" "}
                                                                <span className="font-semibold">
                                                                    {
                                                                        assessment.score
                                                                    }
                                                                    /100
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-muted">
                                                            {formatTimestamp(
                                                                new Date(
                                                                    assessment.timestamp,
                                                                ).toISOString(),
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Summary and details */}
                                                <div className="px-6 py-4">
                                                    {assessment.summary && (
                                                        <div className="mb-4">
                                                            <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
                                                                Summary
                                                            </p>
                                                            <p className="mt-2 text-sm leading-6 text-foreground">
                                                                {assessment.summary}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {assessment.recommendation && (
                                                        <div className="mb-4 border-t border-border pt-4">
                                                            <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
                                                                Recommendation
                                                            </p>
                                                            <p className="mt-2 text-sm leading-6 text-foreground">
                                                                {
                                                                    assessment.recommendation
                                                                }
                                                            </p>
                                                        </div>
                                                    )}

                                                    {assessment.transactionHash && (
                                                        <div className="border-t border-border pt-4">
                                                            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
                                                                        Transaction
                                                                    </p>
                                                                    <p className="mt-2 break-all font-mono text-xs text-muted">
                                                                        {shortHash(
                                                                            assessment.transactionHash,
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <a
                                                                    href={`https://testnet.bscscan.com/tx/${assessment.transactionHash}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="shrink-0 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                                                                >
                                                                    View on BscScan ↗
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}