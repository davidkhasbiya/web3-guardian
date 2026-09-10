import ConnectWallet from "@/components/ConnectWallet";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="border-b border-border bg-card/80">
      <div className="flex w-full items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Web3 Guardian home" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Web3 Guardian logo"
            width={40}
            height={40}
            priority
            className="object-contain"
          />
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
