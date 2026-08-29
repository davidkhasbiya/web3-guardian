export type HistoryRecord = {
    walletAddress: `0x${string}`;
    transactionId: `0x${string}`;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    score: number;
    transactionHash: `0x${string}`;
    timestamp: number;
    blockNumber?: number;
};

const STORAGE_KEY = "web3-guardian-history";

function isValidHistoryRecord(value: unknown): value is HistoryRecord {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    const record = value as Partial<HistoryRecord>;

    return (
        typeof record.walletAddress === "string" &&
        typeof record.transactionId === "string" &&
        (record.riskLevel === "LOW" ||
            record.riskLevel === "MEDIUM" ||
            record.riskLevel === "HIGH") &&
        typeof record.score === "number" &&
        typeof record.transactionHash === "string" &&
        typeof record.timestamp === "number" &&
        (record.blockNumber === undefined || typeof record.blockNumber === "number")
    );
}

function readHistory(): HistoryRecord[] {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const rawValue = window.localStorage.getItem(STORAGE_KEY);
        if (!rawValue) {
            return [];
        }

        const parsedValue = JSON.parse(rawValue) as unknown;
        if (!Array.isArray(parsedValue)) {
            return [];
        }

        return parsedValue.filter(isValidHistoryRecord);
    } catch {
        return [];
    }
}

function writeHistory(records: HistoryRecord[]) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getHistoryRecordsForWallet(walletAddress: `0x${string}` | undefined): HistoryRecord[] {
    if (!walletAddress) {
        return [];
    }

    const normalizedWallet = walletAddress.toLowerCase();

    return readHistory().filter(
        (record) => record.walletAddress.toLowerCase() === normalizedWallet,
    );
}

export function saveAssessmentHistoryRecord(record: HistoryRecord) {
    const existingRecords = readHistory();
    const normalizedWallet = record.walletAddress.toLowerCase();
    const normalizedTransactionHash = record.transactionHash.toLowerCase();
    const normalizedTransactionId = record.transactionId.toLowerCase();

    const recordExists = existingRecords.some(
        (item) =>
            item.walletAddress.toLowerCase() === normalizedWallet &&
            (item.transactionHash.toLowerCase() === normalizedTransactionHash ||
                item.transactionId.toLowerCase() === normalizedTransactionId),
    );

    if (recordExists) {
        return false;
    }

    writeHistory([...existingRecords, record]);
    return true;
}
