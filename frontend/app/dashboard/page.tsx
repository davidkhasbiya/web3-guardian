import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import DashboardOverview from "@/components/DashboardOverview";
import StatusCard from "@/components/StatusCard";
import WalletStatus from "@/components/WalletStatus";

export default function DashboardPage() {
    return (
        <div className="min-h-full">
            <Header />
            <main className="w-full px-5 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-6 md:flex-row">
                    <Sidebar />
                    <div className="min-w-0 flex-1">
                        <section className="mb-8">
                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent-dim">
                                Security dashboard
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                Review transactions before you sign
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                                Connect a Rabby-compatible wallet to get started. Gemini AI risk analysis and
                                on-chain assessment recording are active on BNB Smart Chain Testnet.
                            </p>
                        </section>

                        <section className="grid gap-4 md:grid-cols-3">
                            <WalletStatus />
                            <StatusCard
                                title="AI risk analysis"
                                status="Active"
                                description="Gemini analyzes transaction risk and explains potential risks before you sign."
                            />
                            <StatusCard
                                title="Smart contract"
                                status="Deployed"
                                description="Risk assessments can be recorded on-chain through the Web3Guardian contract on BNB Smart Chain Testnet."
                            />
                        </section>

                        <DashboardOverview />
                    </div>
                </div>
            </main>
        </div>
    );
}
