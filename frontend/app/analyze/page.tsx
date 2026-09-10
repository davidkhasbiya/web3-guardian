import FlowIndicator from "@/components/FlowIndicator";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import TransactionBuilder from "@/components/TransactionBuilder";

export default function AnalyzePage() {
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
                                Transaction Security
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                Analyze Transaction Risk
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                                Review a transaction with AI before recording its security assessment on-chain.
                            </p>
                        </section>

                        {/* Flow Indicator */}
                        <FlowIndicator />

                        {/* Transaction Builder */}
                        <TransactionBuilder />
                    </div>
                </div>
            </main>
        </div>
    );
}
