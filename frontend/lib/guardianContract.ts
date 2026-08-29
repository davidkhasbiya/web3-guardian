import { type Address } from "viem";

export const GUARDIAN_CONTRACT_ADDRESS =
    "0xad05FB1b3fba98680d748Bf44ce617dabA242c14" as Address;

export const GUARDIAN_CHAIN_ID = 97;

export const GUARDIAN_ABI = [
    {
        type: "function",
        name: "recordAssessment",
        stateMutability: "nonpayable",
        inputs: [
            { name: "transactionId", type: "bytes32" },
            { name: "riskLevel", type: "uint8" },
            { name: "score", type: "uint8" },
        ],
        outputs: [],
    },
] as const;

export const RISK_LEVEL_TO_UINT = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
} as const;