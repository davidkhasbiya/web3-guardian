import { Router } from "express";
import { isAddress } from "viem";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/", async (req, res) => {
    try {
        const walletAddress = String(req.query.walletAddress ?? "").trim();

        if (!isAddress(walletAddress)) {
            return res.status(400).json({
                error: "Valid walletAddress is required",
            });
        }

        const { data, error } = await supabase
            .from("contacts")
            .select("*")
            .eq("wallet_address", walletAddress)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Failed to load contacts:", error);
            return res.status(500).json({
                error: "Failed to load contacts",
            });
        }

        return res.json(data);
    } catch (error) {
        console.error("Unexpected contacts error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

router.post("/", async (req, res) => {
    try {
        const {
            walletAddress,
            name,
            contactAddress,
            note,
        } = req.body ?? {};

        if (!isAddress(walletAddress)) {
            return res.status(400).json({
                error: "Valid walletAddress is required",
            });
        }

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                error: "Contact name is required",
            });
        }

        if (!isAddress(contactAddress)) {
            return res.status(400).json({
                error: "Valid contactAddress is required",
            });
        }

        const { data, error } = await supabase
            .from("contacts")
            .insert({
                wallet_address: walletAddress,
                name: name.trim(),
                contact_address: contactAddress,
                note: typeof note === "string" ? note.trim() || null : null,
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to create contact:", error);
            return res.status(500).json({
                error: "Failed to create contact",
            });
        }

        return res.status(201).json(data);
    } catch (error) {
        console.error("Unexpected contacts error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({
                error: "Contact id is required",
            });
        }

        const { error } = await supabase
            .from("contacts")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Failed to delete contact:", error);
            return res.status(500).json({
                error: "Failed to delete contact",
            });
        }

        return res.status(204).send();
    } catch (error) {
        console.error("Unexpected contacts error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

export default router;