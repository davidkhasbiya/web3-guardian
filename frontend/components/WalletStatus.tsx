"use client";

import { useAccount, useChainId } from "wagmi";
import StatusCard from "@/components/StatusCard";
import { formatAddress } from "@/lib/formatAddress";
import { wagmiConfig } from "@/lib/wagmi";
import { getWalletName } from "@/lib/walletName";

export default function WalletStatus() {
  const { address, isConnected, connector, status } = useAccount();
  const chainId = useChainId();

  if (status === "connecting" || status === "reconnecting") {
    return (
      <StatusCard
        title="Wallet"
        status="Connecting..."
        description="Approve the request in your browser wallet."
      />
    );
  }

  if (isConnected && address) {
    const network = wagmiConfig.chains.find((chain) => chain.id === chainId);
    const networkName = network?.name ?? `Chain ID ${chainId}`;

    return (
      <StatusCard
        title="Wallet"
        status={formatAddress(address)}
        description={`Connected via ${getWalletName(connector?.name)} on ${networkName}. You can disconnect from the header at any time.`}
      />
    );
  }

  return (
    <StatusCard
      title="Wallet"
      status="Not connected"
      description="Use Connect Wallet in the header. Browser-based EVM wallets are supported."
    />
  );
}
