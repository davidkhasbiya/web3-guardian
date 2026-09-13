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

        const chainIdNum = Number(chainId);
        if (!Number.isInteger(chainIdNum) || chainIdNum < 0 || chainIdNum > 2147483647) {
            return res.status(400).json({
                error: "Valid chainId is required",
            });
        }

        const riskScoreNum = riskScore !== undefined && riskScore !== null ? Number(riskScore) : null;
        if (
            riskScoreNum !== null &&
            (!Number.isInteger(riskScoreNum) || riskScoreNum < 0 || riskScoreNum > 100)
        ) {
            return res.status(400).json({
                error: "riskScore must be an integer between 0 and 100",
            });
        }

        const blockNumberNum = blockNumber !== undefined && blockNumber !== null ? Number(blockNumber) : null;
        if (blockNumberNum !== null && (!Number.isInteger(blockNumberNum) || blockNumberNum < 0)) {
            return res.status(400).json({
                error: "blockNumber must be a non-negative integer",
            });
        }

        const validateFieldLength = (value: string, maxLen: number): string | null => {
            const trimmed = value?.trim?.();
            return trimmed && trimmed.length > 0 && trimmed.length <= maxLen ? trimmed : null;
        };

        const normalizedTransactionId =
            validateFieldLength(String(transactionId), 256)
            || validateFieldLength(typeof analysis?.transactionId === "string" ? analysis.transactionId : "", 256)
            || validateFieldLength(String(transactionHash), 256)
            || "unknown";

        const validRiskLevels = ["LOW", "MEDIUM", "HIGH", "UNKNOWN"];
        const normalizedRiskLevel = typeof riskLevel === "string" && validRiskLevels.includes(riskLevel.toUpperCase())
            ? riskLevel.toUpperCase()
            : "UNKNOWN";

        const aiSummary = typeof summary === "string" ? summary.trim().substring(0, 2000) : "";
        const txHash = typeof transactionHash === "string" ? transactionHash.trim().substring(0, 256) : null;

        const { data, error } = await supabase
            .from("assessments")
            .insert({
                wallet_address: walletAddress,
                transaction_id: normalizedTransactionId,
                tx_hash: txHash,
                chain_id: chainIdNum,
                block_number: blockNumberNum,
                risk_score: riskScoreNum ?? 0,
                risk_level: normalizedRiskLevel,
                ai_summary: aiSummary,
                ai_reasons: Array.isArray(findings) ? findings : [],
                recommendation: Array.isArray(recommendations)
                    ? recommendations.join("\n").substring(0, 5000)
                    : typeof recommendations === "string"
                        ? recommendations.substring(0, 5000)
                        : "",
                analysis: analysis !== undefined ? analysis : null,
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
 * Requires walletAddress query/body parameter to verify ownership.
 */
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const walletAddress = String(
            req.query.walletAddress ?? req.body?.walletAddress ?? "",
        ).trim();

        if (!id) {
            return res.status(400).json({
                error: "Assessment id is required",
            });
        }

        if (!isAddress(walletAddress)) {
            return res.status(400).json({
                error: "Valid walletAddress is required",
            });
        }

        const { data, error } = await supabase
            .from("assessments")
            .select("*")
            .eq("id", id)
            .eq("wallet_address", walletAddress)
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
 * Requires walletAddress query/body parameter to verify ownership.
 */
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const walletAddress = String(
            req.body?.walletAddress ?? req.query.walletAddress ?? "",
        ).trim();

        if (!id) {
            return res.status(400).json({
                error: "Assessment id is required",
            });
        }

        if (!isAddress(walletAddress)) {
            return res.status(400).json({
                error: "Valid walletAddress is required",
            });
        }

        const { data: existingAssessment, error: existingError } = await supabase
            .from("assessments")
            .select("id, wallet_address")
            .eq("id", id)
            .maybeSingle();

        if (existingError) {
            console.error("Failed to load assessment for deletion:", existingError);
            return res.status(500).json({
                error: "Failed to delete assessment",
            });
        }

        if (!existingAssessment) {
            return res.status(404).json({
                error: "Assessment not found",
            });
        }

        if (existingAssessment.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(403).json({
                error: "Assessment does not belong to this wallet",
            });
        }

        const { error } = await supabase
            .from("assessments")
            .delete()
            .eq("id", id)
            .eq("wallet_address", walletAddress);

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