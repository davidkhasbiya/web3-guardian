import { isAddress, parseEther, type Address } from "viem";

export type PreparedNativeTransfer = {
  from: Address;
  to: Address;
  amountBnb: string;
  asset: "native BNB";
  valueWei: bigint;
  chainId: number;
  chainName: string;
};

export type NativeTransferInput = {
  from?: Address;
  to: string;
  amountBnb: string;
  chainId: number;
  chainName: string;
};

export type NativeTransferValidation = {
  preparedTransaction?: PreparedNativeTransfer;
  errors: {
    from?: string;
    to?: string;
    amountBnb?: string;
  };
};

const DECIMAL_AMOUNT_PATTERN = /^\d+(?:\.\d+)?$/;

export function prepareNativeTransfer({
  from,
  to,
  amountBnb,
  chainId,
  chainName,
}: NativeTransferInput): NativeTransferValidation {
  const trimmedTo = to.trim();
  const trimmedAmount = amountBnb.trim();
  const errors: NativeTransferValidation["errors"] = {};
  let valueWei: bigint | undefined;

  if (!from) {
    errors.from = "Connect your wallet before preparing a transfer.";
  }

  if (!trimmedTo) {
    errors.to = "Recipient address is required.";
  } else if (!isAddress(trimmedTo)) {
    errors.to = "Enter a valid EVM recipient address.";
  }

  if (!trimmedAmount) {
    errors.amountBnb = "Amount is required.";
  } else if (!DECIMAL_AMOUNT_PATTERN.test(trimmedAmount)) {
    errors.amountBnb = "Use a positive decimal number without symbols or commas.";
  } else {
    try {
      valueWei = parseEther(trimmedAmount);
      if (valueWei <= BigInt(0)) {
        errors.amountBnb = "Amount must be greater than 0.";
      }
    } catch {
      errors.amountBnb = "Amount cannot be parsed safely.";
    }
  }

  if (errors.from || errors.to || errors.amountBnb || !from || valueWei === undefined) {
    return { errors };
  }

  return {
    errors,
    preparedTransaction: {
      from,
      to: trimmedTo as Address,
      amountBnb: trimmedAmount,
      asset: "native BNB",
      valueWei,
      chainId,
      chainName,
    },
  };
}
