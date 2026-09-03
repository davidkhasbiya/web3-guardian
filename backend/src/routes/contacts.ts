import { Router } from "express";
import { isAddress } from "viem";
import { supabase } from "../lib/supabase";

const router = Router();

type ContactRow = {
    id: string;
    wallet_address: string;
    name: string;
    contact_address: string;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
};

function normalizeWalletAddress(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return isAddress(trimmed) ? trimmed : null;
}

function normalizeText(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
}

function normalizeContactRow(row: ContactRow) {
    return {
        id: row.id,
        walletAddress: row.wallet_address,
        name: row.name,
        address: row.contact_address,
        note: row.note ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

router.get("/", async (req, res) => {
    try {
        const walletAddress = normalizeWalletAddress(req.query.walletAddress);

        if (!walletAddress) {
            return res.status(400).json({
                error: "Valid walletAddress is required",
            });
        }

        const { data, error } = await supabase
            .from("contacts")
            .select("*")
            .ilike("wallet_address", walletAddress)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Failed to load contacts:", error);
            return res.status(500).json({
                error: "Failed to load contacts",
            });
        }

        return res.json((data ?? []).map((row) => normalizeContactRow(row as ContactRow)));
    } catch (error) {
        console.error("Unexpected contacts error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

router.post("/", async (req, res) => {
    try {
        const payload = req.body ?? {};
        const walletAddress = normalizeWalletAddress(payload.walletAddress);
        const name = normalizeText(payload.name);
        const providedAddress = normalizeWalletAddress(payload.address ?? payload.contactAddress);
        const note = normalizeText(payload.note);

        if (!walletAddress) {
            return res.status(400).json({
                error: "Valid walletAddress is required",
            });
        }

        if (!name) {
            return res.status(400).json({
                error: "Contact name is required",
            });
        }

        if (!providedAddress) {
            return res.status(400).json({
                error: "Valid address is required",
            });
        }

        const { data, error } = await supabase
            .from("contacts")
            .insert({
                wallet_address: walletAddress,
                name,
                contact_address: providedAddress,
                note,
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to create contact:", error);
            return res.status(500).json({
                error: "Failed to create contact",
            });
        }

        return res.status(201).json(normalizeContactRow(data as ContactRow));
    } catch (error) {
        console.error("Unexpected contacts error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const id = req.params.id?.trim();

        if (!id) {
            return res.status(400).json({
                error: "Contact id is required",
            });
        }

        const payload = req.body ?? {};
        const walletAddress = normalizeWalletAddress(payload.walletAddress);

        if (!walletAddress) {
            return res.status(400).json({
                error: "Valid walletAddress is required",
            });
        }

        const { data: existingContact, error: existingError } = await supabase
            .from("contacts")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (existingError) {
            console.error("Failed to load contact for update:", existingError);
            return res.status(500).json({
                error: "Failed to load contact",
            });
        }

        if (!existingContact) {
            return res.status(404).json({
                error: "Contact not found",
            });
        }

        if (existingContact.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(403).json({
                error: "Contact does not belong to this wallet",
            });
        }

        const updates: Record<string, string | null> = {};
        if (Object.prototype.hasOwnProperty.call(payload, "name")) {
            const nextName = normalizeText(payload.name);
            if (nextName === null) {
                return res.status(400).json({
                    error: "Contact name is invalid",
                });
            }
            updates.name = nextName;
        }

        if (Object.prototype.hasOwnProperty.call(payload, "address")) {
            const nextAddress = normalizeWalletAddress(payload.address);
            if (!nextAddress) {
                return res.status(400).json({
                    error: "Valid address is required",
                });
            }
            updates.contact_address = nextAddress;
        }

        if (Object.prototype.hasOwnProperty.call(payload, "note")) {
            const nextNote = payload.note === null || payload.note === undefined
                ? null
                : normalizeText(payload.note);
            updates.note = nextNote;
        }

        if (Object.keys(updates).length === 0) {
            return res.json(normalizeContactRow(existingContact as ContactRow));
        }

        const { data, error } = await supabase
            .from("contacts")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Failed to update contact:", error);
            return res.status(500).json({
                error: "Failed to update contact",
            });
        }

        return res.json(normalizeContactRow(data as ContactRow));
    } catch (error) {
        console.error("Unexpected contacts update error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id?.trim();

        if (!id) {
            return res.status(400).json({
                error: "Contact id is required",
            });
        }

        const walletAddress = normalizeWalletAddress(req.body?.walletAddress ?? req.query.walletAddress);

        if (!walletAddress) {
            return res.status(400).json({
                error: "Valid walletAddress is required",
            });
        }

        const { data: existingContact, error: existingError } = await supabase
            .from("contacts")
            .select("id, wallet_address")
            .eq("id", id)
            .maybeSingle();

        if (existingError) {
            console.error("Failed to load contact for deletion:", existingError);
            return res.status(500).json({
                error: "Failed to load contact",
            });
        }

        if (!existingContact) {
            return res.status(404).json({
                error: "Contact not found",
            });
        }

        if (existingContact.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(403).json({
                error: "Contact does not belong to this wallet",
            });
        }

        const { error } = await supabase
            .from("contacts")
            .delete()
            .eq("id", id)
            .ilike("wallet_address", walletAddress);

        if (error) {
            console.error("Failed to delete contact:", error);
            return res.status(500).json({
                error: "Failed to delete contact",
            });
        }

        return res.status(204).send();
    } catch (error) {
        console.error("Unexpected contacts delete error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

export default router;