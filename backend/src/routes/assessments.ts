import { Router } from "express";
import { isAddress } from "viem";
import { supabase } from "../lib/supabase";

const router = Router();

/**
 * GET /api/assessments?walletAddress=0x...
 * Load assessment history for a wallet.
 */
router.get("/", async (req, res) => {
    try {
        const walletAddress = String(
            req.query.walletAddress ?? "",
        ).trim();

        if (!isAddress(walletAddress)) {
            return res.status(400).json({
                error: "Valid walletAddress is required",
            });
        }

        const { data, error } = await supabase
            .from("assessments")
            .select("*")
            .eq("wallet_address", walletAddress)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Failed to load assessments:", error);

            return res.status(500).json({
                error: "Failed to load assessments",
            });
        }

        const normalizedData = Array.isArray(data)
            ? data.map((record) => {
                const analysis =
                    record && typeof record.analysis === "object" && record.analysis !== null
                        ? record.analysis
                        : null;
                const fallbackTransactionId =
                    analysis && typeof analysis === "object" && "transactionId" in analysis
                        ? typeof analysis.transactionId === "string"
                            ? analysis.transactionId.trim()
                            : ""
                        : "";

                const existingTransactionId =
                    typeof record?.transaction_id === "string"
                        ? record.transaction_id.trim()
                        : "";

                return {
                    ...record,
                    transaction_id:
                        existingTransactionId &&
                            existingTransactionId !== "unknown"
                            ? existingTransactionId
                            : fallbackTransactionId || existingTransactionId || "unknown",
                };
            })
            : [];

        return res.json(normalizedData);
    } catch (error) {
        console.error("Unexpected assessments error:", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

/**
 * POST /api/assessments
 * Save an assessment result.
 */
router.post("/", async (req, res) => {
    try {
        const {
            walletAddress,
            chainId,
            transactionId,
            transactionHash,
            riskScore,
            riskLevel,
            summary,
            findings,
            recommendations,
            blockNumber,
            analysis,
        } = req.body ?? {};

        if (!isAddress(walletAddress)) {
            return res.status(400).json({
                error: "Valid walletAddress is required",
            });
        }

        if (!Number.isInteger(Number(chainId))) {
            return res.status(400).json({
                error: "Valid chainId is required",
            });
        }

        if (
            riskScore !== undefined &&
            riskScore !== null &&
            !Number.isInteger(Number(riskScore))
        ) {
            return res.status(400).json({
                error: "riskScore must be an integer",
            });
        }

        if (
            blockNumber !== undefined &&
            blockNumber !== null &&
            !Number.isInteger(Number(blockNumber))
        ) {
            return res.status(400).json({
                error: "blockNumber must be an integer",
            });
        }

        const normalizedTransactionId =
            typeof transactionId === "string" && transactionId.trim() !== ""
                ? transactionId.trim()
                : typeof analysis === "object" &&
                    analysis !== null &&
                    "transactionId" in analysis &&
                    typeof analysis.transactionId === "string" &&
                    analysis.transactionId.trim() !== ""
                    ? analysis.transactionId.trim()
                    : typeof transactionHash === "string"
                        ? transactionHash.trim()
                        : "unknown";

        const { data, error } = await supabase
            .from("assessments")
            .insert({
                wallet_address: walletAddress,
                transaction_id: normalizedTransactionId,

                tx_hash:
                    typeof transactionHash === "string"
                        ? transactionHash.trim()
                        : null,

                chain_id: Number(chainId),

                block_number:
                    blockNumber === undefined || blockNumber === null
                        ? null
                        : Number(blockNumber),

                risk_score:
                    riskScore === undefined || riskScore === null
                        ? 0
                        : Number(riskScore),

                risk_level:
                    typeof riskLevel === "string"
                        ? riskLevel.trim()
                        : "UNKNOWN",

                ai_summary:
                    typeof summary === "string"
                        ? summary.trim()
                        : "",

                ai_reasons: Array.isArray(findings)
                    ? findings
                    : [],

                recommendation: Array.isArray(recommendations)
                    ? recommendations.join("\n")
                    : typeof recommendations === "string"
                        ? recommendations
                        : "",

                analysis:
                    analysis !== undefined
                        ? analysis
                        : null,
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to create assessment:", error);

            return res.status(500).json({
                error: "Failed to create assessment",
            });
        }

        return res.status(201).json(data);
    } catch (error) {
        console.error("Unexpected assessments error:", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

/**
 * GET /api/assessments/:id
 */
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({
                error: "Assessment id is required",
            });
        }

        const { data, error } = await supabase
            .from("assessments")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.error("Failed to load assessment:", error);

            return res.status(404).json({
                error: "Assessment not found",
            });
        }

        return res.json(data);
    } catch (error) {
        console.error("Unexpected assessment detail error:", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

/**
 * DELETE /api/assessments/:id
 */
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({
                error: "Assessment id is required",
            });
        }

        const { error } = await supabase
            .from("assessments")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Failed to delete assessment:", error);

            return res.status(500).json({
                error: "Failed to delete assessment",
            });
        }

        return res.status(204).send();
    } catch (error) {
        console.error("Unexpected assessment delete error:", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

export default router;