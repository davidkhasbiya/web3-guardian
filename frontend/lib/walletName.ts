export function getWalletName(name?: string) {
  const walletName = name?.trim();

  if (!walletName || /^(injected|injected wallet)$/i.test(walletName)) {
    return "Browser Wallet";
  }

  return walletName;
}
