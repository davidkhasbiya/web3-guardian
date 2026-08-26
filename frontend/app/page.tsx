import Header from "@/components/Header";
import StatusCard from "@/components/StatusCard";
import WalletStatus from "@/components/WalletStatus";

export default function Home() {
  return (
    <div className="min-h-full">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent-dim">
            Security dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Review transactions before you sign
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Connect a Rabby-compatible wallet to get started. Gemini AI risk
            analysis and the Solidity smart contract will be added in later
            steps.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <WalletStatus />
          <StatusCard
            title="AI risk analysis"
            status="Not enabled"
            description="Gemini AI will later explain transaction risk in plain language before you approve."
          />
          <StatusCard
            title="Smart contract"
            status="Not deployed"
            description="A Foundry Solidity contract will later store or verify guardian results on-chain."
          />
        </section>
      </main>
    </div>
  );
}
