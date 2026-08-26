"use client";

import { useAccount } from "wagmi";
import StatusCard from "@/components/StatusCard";
import { formatAddress } from "@/lib/formatAddress";

export default function WalletStatus() {
  const { address, isConnected, connector, status } = useAccount();

  if (status === "connecting" || status === "reconnecting") {
    return (
      <StatusCard
        title="Wallet"
        status="Connecting..."
        description="Approve the request in your injected wallet, such as Rabby."
      />
    );
  }

  if (isConnected && address) {
    const walletName = connector?.name ? ` via ${connector.name}` : "";

    return (
      <StatusCard
        title="Wallet"
        status={formatAddress(address)}
        description={`Connected${walletName}. You can disconnect from the header at any time.`}
      />
    );
  }

  return (
    <StatusCard
      title="Wallet"
      status="Not connected"
      description="Use Connect Wallet in the header. Rabby and other injected EVM wallets are supported."
    />
  );
}
