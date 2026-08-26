"use client";

import { useState, useSyncExternalStore } from "react";
import { useAccount, useConnect, useConnectors, useDisconnect } from "wagmi";
import { getConnectErrorMessage } from "@/lib/connectError";
import { formatAddress } from "@/lib/formatAddress";
import { getWalletName } from "@/lib/walletName";

function subscribeToMount() {
  return () => {};
}

export default function ConnectWallet() {
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);
  const [message, setMessage] = useState("");
  const [showWalletChoices, setShowWalletChoices] = useState(false);
  const { address, isConnected } = useAccount();
  const { connectAsync, isPending } = useConnect();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();

  const injectedConnectors = connectors.filter(
    (connector) => connector.type === "injected" || connector.id.includes("injected"),
  );
  const namedInjectedConnectors = injectedConnectors.filter(
    (connector) => getWalletName(connector.name) !== "Browser Wallet",
  );
  const availableConnectors =
    namedInjectedConnectors.length > 0 ? namedInjectedConnectors : injectedConnectors;
  const hasMultipleWallets = availableConnectors.length > 1;

  async function handleConnect(connector: (typeof availableConnectors)[number]) {
    setMessage("");

    try {
      await connectAsync({ connector });
      setShowWalletChoices(false);
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
        onClick={() => {
          if (hasMultipleWallets) {
            setMessage("");
            setShowWalletChoices((isOpen) => !isOpen);
            return;
          }

          const connector = availableConnectors[0];
          if (connector) {
            void handleConnect(connector);
          } else {
            setMessage("No browser wallet found. Install or enable an EVM wallet, then refresh this page.");
          }
        }}
        disabled={isPending}
        className="rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 disabled:opacity-60"
      >
        {isPending ? "Connecting..." : hasMultipleWallets ? "Choose Wallet" : "Connect Wallet"}
      </button>
      {showWalletChoices ? (
        <div className="flex flex-col items-end gap-2">
          {availableConnectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              onClick={() => void handleConnect(connector)}
              disabled={isPending}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:border-accent/40 hover:text-foreground disabled:opacity-60"
            >
              {getWalletName(connector.name)}
            </button>
          ))}
        </div>
      ) : null}
      {message ? <p className="max-w-xs text-right text-xs text-red-400">{message}</p> : null}
    </div>
  );
}
