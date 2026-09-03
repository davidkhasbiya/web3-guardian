import ConnectWallet from "@/components/ConnectWallet";
import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-border bg-card/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Web3 Guardian home" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 font-mono text-sm font-semibold text-accent">
            WG
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide">Web3 Guardian</p>
            <p className="text-xs text-muted">AI-powered transaction security</p>
          </div>
        </Link>
        <ConnectWallet />
      </div>
    </header>
  );
}
