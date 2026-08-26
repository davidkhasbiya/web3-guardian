export default function Header() {
  return (
    <header className="border-b border-border bg-card/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 font-mono text-sm font-semibold text-accent">
            WG
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide">Web3 Guardian</p>
            <p className="text-xs text-muted">Transaction risk dashboard</p>
          </div>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
          Wallet coming soon
        </span>
      </div>
    </header>
  );
}
