import Link from "next/link";
import Image from "next/image";

const capabilities = [
  [
    "AI",
    "AI Risk Analysis",
    "Understand potential transaction risks before signing.",
  ],
  [
    "ON",
    "On-chain Assessment",
    "Record assessment results on the blockchain for transparent verification.",
  ],
  [
    "↗",
    "Transaction History",
    "Review previously recorded security assessments in one place.",
  ],
];

const features = [
  [
    "01",
    "AI-assisted risk scoring",
    "Analyze transaction context and receive a clear risk level and score.",
  ],
  [
    "02",
    "Transaction preview",
    "Review sender, recipient, amount, asset, and network before proceeding.",
  ],
  [
    "03",
    "On-chain verification",
    "Record assessment results on-chain and verify the transaction through a block explorer.",
  ],
  [
    "04",
    "Assessment history",
    "Keep a searchable record of previous security assessments.",
  ],
];

const steps = [
  ["01", "Connect your wallet", "Connect a compatible browser wallet."],
  [
    "02",
    "Prepare a transaction",
    "Enter the recipient, asset, amount, and network.",
  ],
  [
    "03",
    "Analyze the risk",
    "Get an AI-assisted risk level, score, reasons, and recommendation.",
  ],
  [
    "04",
    "Review and record",
    "Review the assessment and record it on-chain when ready.",
  ],
];

function Brand() {
  return (
    <Link
      href="/"
      aria-label="Web3 Guardian home"
      className="flex items-center gap-3"
    >
      <Image
        src="/logo.png"
        alt="Web3 Guardian logo"
        width={36}
        height={36}
        className="object-contain"
      />
      <span className="hidden sm:block">
        <span className="block text-sm font-semibold tracking-wide">
          Web3 Guardian
        </span>
        <span className="block text-xs text-muted">
          AI-powered transaction security
        </span>
      </span>
    </Link>
  );
}

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

export default function Page() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="border-b border-border/80 bg-background/90">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8"
          aria-label="Main navigation"
        >
          <Brand />
          <div className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a
              className="transition-colors hover:text-foreground"
              href="#features"
            >
              Features
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#how-it-works"
            >
              How it works
            </a>
            <Link
              className="transition-colors hover:text-foreground"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-accent/50 bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-cyan-300"
            >
              Launch App <Arrow />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-28 lg:pt-28">
          <div
            className="absolute left-1/2 top-0 -z-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/5 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/5 px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.16em] text-accent">
              <span
                className="h-1.5 w-1.5 rounded-full bg-accent"
                aria-hidden="true"
              />
              AI-POWERED WEB3 SECURITY
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Know the risk
              <br />
              <span className="text-accent">before you sign.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-muted sm:text-lg">
              Web3 Guardian helps you understand transaction risk before
              interacting with the blockchain through AI-assisted analysis,
              transaction review, and on-chain assessment records.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-background transition-colors hover:bg-cyan-300"
              >
                Launch Web3 Guardian{" "}
                <span className="ml-2">
                  <Arrow />
                </span>
              </Link>
            </div>
          </div>
          <div className="relative z-10 mx-auto w-full max-w-lg rounded-2xl border border-border bg-card/90 p-4 shadow-2xl shadow-cyan-950/20 sm:p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  Transaction review
                </p>
                <p className="mt-1 text-sm font-medium">Assessment preview</p>
              </div>
              <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 font-mono text-[10px] text-accent">
                DEMO
              </span>
            </div>
            <div className="my-5 space-y-3 rounded-xl border border-border/80 bg-background/60 p-4 font-mono text-xs">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">
                  From
                </p>
                <p>0xf3...79af</p>
              </div>
              <div className="flex items-center gap-3 text-accent">
                <span
                  className="ml-1 h-7 border-l border-dashed border-accent/50"
                  aria-hidden="true"
                />
                <span aria-hidden="true">↓</span>
                <span className="text-[10px] uppercase tracking-widest text-muted">
                  Transfer
                </span>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">
                  To
                </p>
                <p>0xad...2c14</p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">
                    Asset
                  </p>
                  <p>0.000001 BNB</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-muted">
                    Network
                  </p>
                  <p>BNB Testnet</p>
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between rounded-xl border border-accent/25 bg-accent/5 p-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                  Assessment ready
                </p>
                <p className="mt-2 text-sm font-medium">Low risk detected</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-3xl font-semibold text-accent">
                  10<span className="text-sm text-muted">/100</span>
                </p>
                <p className="font-mono text-[10px] text-muted">LOW RISK</p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="border-y border-border/80 bg-card/35"
          aria-label="Capabilities"
        >
          <div className="mx-auto grid max-w-7xl divide-y divide-border/80 px-5 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
            {capabilities.map(([mark, title, description]) => (
              <article
                key={title}
                className="flex gap-4 px-0 py-6 md:px-7 first:md:pl-0 last:md:pr-0"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/25 font-mono text-xs font-semibold text-accent">
                  {mark}
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-7xl scroll-mt-10 px-5 py-20 lg:px-8 lg:py-28"
        >
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-dim">
              The review layer
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Security before execution.
            </h2>
            <p className="mt-5 leading-7 text-muted">
              Web3 transactions are irreversible. Web3 Guardian adds a review
              layer before you sign, helping you understand what you are about
              to approve.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {features.map(([number, title, description]) => (
              <article
                key={title}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-accent/35"
              >
                <p className="font-mono text-xs text-accent">{number}</p>
                <h3 className="mt-8 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-border/80 bg-card/25 scroll-mt-10"
        >
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-dim">
                  A considered workflow
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                  How Web3 Guardian works
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-muted">
                A clear path from wallet connection to an informed decision.
              </p>
            </div>
            <div className="mt-14 grid gap-8 md:grid-cols-4 md:gap-5">
              {steps.map(([number, title, description], index) => (
                <article key={number} className="relative">
                  <div className="mb-5 flex items-center gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/50 bg-background font-mono text-xs text-accent">
                      {number}
                    </span>
                    <span
                      className="hidden h-px flex-1 bg-border md:block"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {description}
                  </p>
                  {index === steps.length - 1 ? null : (
                    <span
                      className="absolute left-5 top-14 h-8 border-l border-dashed border-border md:hidden"
                      aria-hidden="true"
                    />
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-dim">
                Web3 Guardian security workflow
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                Built for informed decisions.
              </h2>
            </div>
            <span className="font-mono text-xs text-muted">
              STATIC PREVIEW / 01
            </span>
          </div>
          <div className="grid gap-8 rounded-2xl border border-border bg-card p-5 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted">
                AI-assisted risk assessment
              </p>
              <div className="mt-10 flex items-end gap-5">
                <span className="font-mono text-6xl font-semibold text-accent">
                  10
                </span>
                <span className="mb-2 font-mono text-sm text-muted">
                  /100
                  <br />
                  <span className="text-accent">LOW</span>
                </span>
              </div>
              <div className="mt-8 h-1 rounded-full bg-background">
                <div className="h-1 w-[10%] rounded-full bg-accent" />
              </div>
            </div>
            <div className="border-t border-border pt-7 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <p className="text-sm font-semibold">Reasons</p>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                <li>• Native asset transfer</li>
                <li>• Small transaction amount</li>
                <li>• Testnet environment</li>
              </ul>
              <div className="mt-8 border-t border-border pt-6">
                <p className="text-sm font-semibold">Recommendation</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Review the recipient address before signing.
                </p>
              </div>
              <p className="mt-7 font-mono text-xs text-accent">
                ✓ Assessment recorded on-chain
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-accent/20 bg-accent/[0.04]">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center lg:py-24">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-dim">
              The security principle
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your transaction. Your decision.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl leading-7 text-muted">
              Web3 Guardian provides AI-assisted analysis to help you make more
              informed decisions. The assessment is informational and does not
              guarantee that a transaction is safe.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center sm:px-10">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to inspect your next transaction?
            </h2>
            <p className="mt-4 text-muted">
              Analyze transaction risk before you sign.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-background hover:bg-cyan-300"
              >
                Launch Web3 Guardian{" "}
                <span className="ml-2">
                  <Arrow />
                </span>
              </Link>
              <p className="flex min-h-12 items-center justify-center px-5 font-mono text-xs text-muted">
                No transaction is signed automatically.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm sm:flex-row sm:items-end sm:justify-between lg:px-8">
          <div>
            <p className="font-semibold">Web3 Guardian</p>
            <p className="mt-1 text-xs text-muted">
              AI-powered transaction security
            </p>
          </div>
          <div className="text-left text-xs text-muted sm:text-right">
            <p>Built for Web3 security experimentation</p>
            <p className="mt-1">© 2026 Web3 Guardian</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
