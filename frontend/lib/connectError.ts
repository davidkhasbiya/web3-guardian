export function getConnectErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Could not connect to the wallet. Please try again.";
  }

  const err = error as {
    name?: string;
    code?: number;
    message?: string;
    shortMessage?: string;
  };

  const text = `${err.name ?? ""} ${err.message ?? ""} ${err.shortMessage ?? ""}`.toLowerCase();

  if (err.name === "UserRejectedRequestError" || err.code === 4001 || text.includes("rejected")) {
    return "Connection request was rejected in the wallet.";
  }

  if (err.name === "ProviderNotFoundError" || text.includes("provider not found")) {
    return "No injected wallet found. Install Rabby or another EVM wallet, then refresh this page.";
  }

  return "Could not connect to the wallet. Please try again.";
}
