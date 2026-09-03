"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import Link from "next/link";

import { GUARDIAN_CHAIN_ID } from "@/lib/guardianContract";
import { wagmiConfig } from "@/lib/wagmi";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type ApiAssessment = {
    id: string;
    transaction_id: string | null;
    tx_hash: string | null;
    risk_level: RiskLevel | null;
    risk_score: number | null;
    ai_summary: string | null;
    recommendation: string | null;
    created_at: string;
};

type Assessment = {
    id: string;
    transactionId: string | null;
    transactionHash: string | null;
    riskLevel: RiskLevel;
    score: number;
    summary: string | null;
    recommendation: string | null;
    timestamp: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function mapAssessment(record: ApiAssessment): Assessment {
    return {
        id: record.id,
        transactionId: record.transaction_id,
        transactionHash: record.tx_hash,
        riskLevel: record.risk_level ?? "LOW",
        score: record.risk_score ?? 0,
        summary: record.ai_summary,
        recommendation: record.recommendation,
        timestamp: new Date(record.created_at).getTime(),
    };
}

function shortId(value: string) {
    return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function riskClasses(riskLevel: RiskLevel) {
    if (riskLevel === "HIGH") {
        return "border-red-500/30 bg-red-500/10 text-red-400";
    }

    if (riskLevel === "MEDIUM") {
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
    }

    return "border-accent/30 bg-accent/10 text-accent";
}

function SummaryCard({ label, value }: { label: string; value: number }) {
    return (
        <article className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-3 font-mono text-2xl font-semibold text-accent">
                {value}
            </p>
        </article>
    );
}

function RecentAssessment({ assessment }: { assessment: Assessment }) {
    const transactionReference = assessment.transactionHash ?? assessment.transactionId;

    return (
        <article className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskClasses(assessment.riskLevel)}`}>
                            {assessment.riskLevel}
                        </span>
                        <span className="font-mono text-sm text-foreground">
                            {assessment.score}/100
                        </span>
                    </div>
                    <p className="mt-3 break-all font-mono text-xs text-muted">
                        {transactionReference ? shortId(transactionReference) : "Transaction ID unavailable"}
                    </p>
                </div>
                <time className="shrink-0 text-left text-xs text-muted sm:text-right" dateTime={new Date(assessment.timestamp).toISOString()}>
                    {formatDate(assessment.timestamp)}
                </time>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
                {assessment.recommendation ?? assessment.summary ?? "No recommendation provided."}
            </p>
            {assessment.transactionHash ? (
                <a
                    href={`https://testnet.bscscan.com/tx/${assessment.transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
                >
                    View transaction ↗
                </a>
            ) : null}
        </article>
    );
}

export default function DashboardOverview() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const network = wagmiConfig.chains.find((chain) => chain.id === chainId);
    const networkName = network?.name ?? `Chain ID ${chainId}`;
    const isWrongNetwork = isConnected && Boolean(address) && chainId !== GUARDIAN_CHAIN_ID;
    const canLoadAssessments = isConnected && Boolean(address) && !isWrongNetwork;

    useEffect(() => {
        if (!canLoadAssessments || !address) {
            return;
        }

        const walletAddress = address;
        const controller = new AbortController();

        async function loadAssessments() {
            setIsLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `${API_URL}/api/assessments?walletAddress=${encodeURIComponent(walletAddress)}`,
                    { signal: controller.signal },
                );
                const data = (await response.json()) as unknown;

                if (!response.ok) {
                    throw new Error("Failed to load assessment history.");
                }

                setAssessments(
                    Array.isArray(data)
                        ? (data as ApiAssessment[]).map(mapAssessment)
                        : [],
                );
            } catch (loadError) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error(loadError);
                setError("Unable to load assessment history.");
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadAssessments();

        return () => controller.abort();
    }, [address, canLoadAssessments]);

    const visibleAssessments = canLoadAssessments ? assessments : [];
    const counts = visibleAssessments.reduce(
        (summary, assessment) => {
            summary[assessment.riskLevel] += 1;
            return summary;
        },
        { LOW: 0, MEDIUM: 0, HIGH: 0 },
    );
    const recentAssessments = visibleAssessments.slice(0, 3);

    return (
        <div className="mt-8 space-y-8">
            <div className="flex flex-col gap-2 border-l border-accent/40 pl-4 text-sm text-muted sm:flex-row sm:items-center sm:gap-4 sm:border-l-0 sm:pl-0">
                <span>Network: <span className="font-mono text-foreground">{networkName}</span></span>
                <span className="hidden text-border sm:inline" aria-hidden="true">|</span>
                <span>Wallet: <span className="text-foreground">{isConnected && address ? "Connected" : "Not connected"}</span></span>
            </div>

            <section aria-labelledby="security-overview-heading">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-dim">Activity summary</p>
                        <h2 id="security-overview-heading" className="mt-2 text-xl font-semibold tracking-tight">Security Overview</h2>
                    </div>
                    {isWrongNetwork ? <p className="text-right text-xs text-red-400">Switch to BNB Smart Chain Testnet</p> : null}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <SummaryCard label="Total Assessments" value={assessments.length} />
                    <SummaryCard label="Low Risk" value={counts.LOW} />
                    <SummaryCard label="Medium Risk" value={counts.MEDIUM} />
                    <SummaryCard label="High Risk" value={counts.HIGH} />
                </div>
            </section>

            <section aria-labelledby="recent-assessments-heading">
                <div className="flex items-center justify-between gap-4">
                    <h2 id="recent-assessments-heading" className="text-xl font-semibold tracking-tight">Recent Assessments</h2>
                    <Link href="/history" className="shrink-0 text-sm font-medium text-accent hover:underline">View all assessments →</Link>
                </div>
                {isLoading ? (
                    <div className="mt-4 rounded-xl border border-border bg-card p-6 text-sm text-muted">Loading assessment history...</div>
                ) : error ? (
                    <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-6"><p className="text-sm font-medium text-red-400">Could not load assessments</p><p className="mt-2 text-sm text-muted">{error}</p></div>
                ) : recentAssessments.length > 0 ? (
                    <div className="mt-4 space-y-3">{recentAssessments.map((assessment) => <RecentAssessment key={assessment.id} assessment={assessment} />)}</div>
                ) : (
                    <div className="mt-4 rounded-xl border border-border bg-card p-8 text-center">
                        <p className="text-sm font-medium">No assessments yet</p>
                        <p className="mt-2 text-sm text-muted">Analyze your first transaction to see security insights here.</p>
                        <Link href="/analyze" className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-accent/40 bg-accent/10 px-4 text-sm font-medium text-accent hover:bg-accent/20">Analyze Transaction →</Link>
                    </div>
                )}
            </section>

            <section aria-labelledby="quick-actions-heading">
                <h2 id="quick-actions-heading" className="text-xl font-semibold tracking-tight">Quick Actions</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Link href="/analyze" className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-background/60">Analyze Transaction <span className="text-accent">→</span></Link>
                    <Link href="/contacts" className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-background/60">Manage Contacts <span className="text-accent">→</span></Link>
                    <Link href="/history" className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-background/60">View Assessment History <span className="text-accent">→</span></Link>
                </div>
            </section>
        </div>
    );
}
