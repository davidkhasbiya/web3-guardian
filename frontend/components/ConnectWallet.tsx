"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useConnectors, useDisconnect } from "wagmi";
import { getConnectErrorMessage } from "@/lib/connectError";
import { formatAddress } from "@/lib/formatAddress";

function hasInjectedWallet() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export default function ConnectWallet() {
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");
  const { address, isConnected } = useAccount();
  const { connectAsync, isPending } = useConnect();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleConnect() {
    setMessage("");

    const injectedConnectors = connectors.filter(
      (connector) => connector.type === "injected" || connector.id.includes("injected"),
    );
    const rabbyConnector = injectedConnectors.find((connector) =>
      connector.name.toLowerCase().includes("rabby"),
    );
    const connector = rabbyConnector ?? injectedConnectors[0] ?? connectors[0];

    if (!connector || (!hasInjectedWallet() && injectedConnectors.length === 0)) {
      setMessage(
        "No injected wallet found. Install Rabby or another EVM wallet, then refresh this page.",
      );
      return;
    }

    try {
      await connectAsync({ connector });
    } catch (error) {
      setMessage(getConnectErrorMessage(error));
    }
  }

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="rounded-full border border-border px-4 py-2 text-sm text-muted"
      >
        Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-accent">{formatAddress(address)}</span>
        <button
          type="button"
          onClick={() => {
            setMessage("");
            disconnect();
          }}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:border-accent/40 hover:text-foreground"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleConnect}
        disabled={isPending}
        className="rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 disabled:opacity-60"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      {message ? <p className="max-w-xs text-right text-xs text-red-400">{message}</p> : null}
    </div>
  );
}
