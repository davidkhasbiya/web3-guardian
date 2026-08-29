"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { GUARDIAN_CHAIN_ID } from "@/lib/guardianContract";
import { getHistoryRecordsForWallet } from "@/lib/historyStorage";

type AssessmentHistory = {
    transactionHash: `0x${string}`;
    transactionId: `0x${string}`;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    score: number;
    timestamp: number;
    blockNumber: number;
};

function shortHash(hash: string) {
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function formatTimestamp(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });
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

        const requestId = requestRef.current + 1;
        requestRef.current = requestId;
        let cancelled = false;

        async function loadHistory() {
            setIsLoading(true);
            setError("");

            try {
                const records: AssessmentHistory[] = getHistoryRecordsForWallet(address)
                    .map((record) => ({
                        transactionHash: record.transactionHash as `0x${string}`,
                        transactionId: record.transactionId as `0x${string}`,
                        riskLevel: record.riskLevel,
                        score: record.score,
                        timestamp: record.timestamp,
                        blockNumber: record.blockNumber ?? 0,
                    }))
                    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

                if (cancelled || requestId !== requestRef.current) {
                    return;
                }

                setHistory(records);
            } catch (loadError) {
                if (cancelled || requestId !== requestRef.current) {
                    return;
                }

                console.error(loadError);
                setError("Unable to load assessment history from BNB Smart Chain Testnet.");
            } finally {
                if (!cancelled && requestId === requestRef.current) {
                    setIsLoading(false);
                }
            }
        }

        void loadHistory();

        return () => {
            cancelled = true;
        };
    }, [address, chainId, isConnected]);

    const showWalletPrompt = !isConnected || !address;
    const showNetworkPrompt = isConnected && Boolean(address) && chainId !== GUARDIAN_CHAIN_ID;
    const showLoading = !showWalletPrompt && !showNetworkPrompt && isLoading;
    const showError = !showWalletPrompt && !showNetworkPrompt && !isLoading && Boolean(error);
    const showEmpty = !showWalletPrompt && !showNetworkPrompt && !isLoading && !error && history.length === 0;
    const showHistory = !showWalletPrompt && !showNetworkPrompt && !isLoading && !error && history.length > 0;

    return (
        <div className="min-h-full">
            <Header />

            <main className="mx-auto max-w-6xl px-6 py-8">
                <div className="flex flex-col gap-6 md:flex-row">
                    <Sidebar />

                    <section className="min-w-0 flex-1">
                        <div className="rounded-xl border border-border bg-card p-5">
                            <p className="text-sm text-muted">Assessment History</p>

                            <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                                <div>
                                    <h1 className="text-2xl font-semibold tracking-tight">Recorded reviews</h1>

                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                                        Your AI-assisted security assessments recorded on BNB Smart Chain Testnet.
                                    </p>
                                </div>

                                {isConnected && !showNetworkPrompt && (
                                    <div className="rounded-full border border-border px-3 py-1.5 text-xs text-muted">
                                        {history.length} {history.length === 1 ? "assessment" : "assessments"}
                                    </div>
                                )}
                            </div>
                        </div>

                        {showWalletPrompt ? (
                            <div className="mt-5 rounded-xl border border-border bg-card p-8 text-center">
                                <p className="text-sm font-medium">Connect your wallet to view history</p>

                                <p className="mt-2 text-sm text-muted">
                                    Your recorded assessments are linked to your wallet address.
                                </p>
                            </div>
                        ) : showNetworkPrompt ? (
                            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                                <p className="text-sm font-medium text-red-400">Wrong network</p>
                                <p className="mt-2 text-sm leading-6 text-muted">
                                    Switch your wallet to BNB Smart Chain Testnet (chain ID 97) to view assessment history.
                                </p>
                            </div>
                        ) : showLoading ? (
                            <div className="mt-5 rounded-xl border border-border bg-card p-8 text-center">
                                <p className="text-sm text-muted">Loading on-chain assessment history...</p>
                            </div>
                        ) : showError ? (
                            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                                <p className="text-sm font-medium text-red-400">Could not load history</p>
                                <p className="mt-2 text-sm leading-6 text-muted">{error}</p>
                            </div>
                        ) : showEmpty ? (
                            <div className="mt-5 rounded-xl border border-border bg-card p-8 text-center">
                                <p className="text-sm font-medium">No assessments recorded yet</p>
                                <p className="mt-2 text-sm leading-6 text-muted">
                                    Analyze a transaction and record its assessment to see it appear here.
                                </p>
                            </div>
                        ) : showHistory ? (
                            <div className="mt-5 space-y-4">
                                {history.map((assessment) => (
                                    <article
                                        key={`${assessment.transactionHash}-${assessment.blockNumber}`}
                                        className="rounded-xl border border-border bg-card p-5"
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${assessment.riskLevel === "HIGH"
                                                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                                                            : assessment.riskLevel === "MEDIUM"
                                                                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                                                                : "border-accent/30 bg-accent/10 text-accent"
                                                            }`}
                                                    >
                                                        {assessment.riskLevel}
                                                    </span>

                                                    <span className="text-sm text-muted">
                                                        Risk score: <span className="font-medium text-foreground">{assessment.score}/100</span>
                                                    </span>
                                                </div>

                                                <p className="mt-4 text-xs text-muted">Transaction ID</p>
                                                <p className="mt-1 break-all font-mono text-sm">{assessment.transactionId}</p>
                                            </div>

                                            <div className="text-left sm:text-right">
                                                <p className="text-xs text-muted">Recorded</p>
                                                <p className="mt-1 text-sm">{formatTimestamp(assessment.timestamp)}</p>
                                                <p className="mt-2 text-xs text-muted">Block #{assessment.blockNumber}</p>
                                            </div>
                                        </div>

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
                                                    <span className="font-mono text-xs text-muted">{shortHash(assessment.transactionHash)}</span>
                                                </div>

                                                <span className="text-xs text-muted">Tx hash: {assessment.transactionHash}</span>
                                            </div>
                                        </div>
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
