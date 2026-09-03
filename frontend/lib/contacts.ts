import { isAddress } from "viem";

export type Contact = {
    id: string;
    walletAddress: string;
    name: string;
    address: string;
    note?: string;
    createdAt?: string;
    updatedAt?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiContact = {
    id?: string;
    walletAddress?: string;
    wallet_address?: string;
    name?: string;
    address?: string;
    contact_address?: string;
    note?: string | null;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
};

function normalizeContact(raw: unknown): Contact | null {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return null;
    }

    const contact = raw as ApiContact;
    const walletAddress = typeof contact.walletAddress === "string"
        ? contact.walletAddress.trim()
        : typeof contact.wallet_address === "string"
            ? contact.wallet_address.trim()
            : "";

    const address = typeof contact.address === "string"
        ? contact.address.trim()
        : typeof contact.contact_address === "string"
            ? contact.contact_address.trim()
            : "";

    const name = typeof contact.name === "string" ? contact.name.trim() : "";

    if (
        typeof contact.id !== "string" ||
        !contact.id.trim() ||
        !isAddress(walletAddress) ||
        !isAddress(address) ||
        name.length === 0
    ) {
        return null;
    }

    return {
        id: contact.id,
        walletAddress,
        name,
        address,
        note:
            typeof contact.note === "string" && contact.note.trim().length > 0
                ? contact.note.trim()
                : undefined,
        createdAt: contact.createdAt ?? contact.created_at,
        updatedAt: contact.updatedAt ?? contact.updated_at,
    };
}

async function apiRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
        },
        ...(body !== undefined
            ? { body: JSON.stringify(body) }
            : {}),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            typeof payload === "object" &&
                payload !== null &&
                "error" in payload &&
                typeof payload.error === "string"
                ? payload.error
                : "Request failed.";

        throw new Error(message);
    }

    return payload as T;
}

export async function getContacts(walletAddress: string): Promise<Contact[]> {
    if (!isAddress(walletAddress)) {
        return [];
    }

    const response = await apiRequest<unknown[]>(
        `/api/contacts?walletAddress=${encodeURIComponent(walletAddress)}`,
    );

    return Array.isArray(response)
        ? response
            .map((candidate) => normalizeContact(candidate))
            .filter((contact): contact is Contact => contact !== null)
        : [];
}

export async function createContact(input: {
    walletAddress: string;
    name: string;
    address: string;
    note?: string | null;
}): Promise<Contact> {
    const data = await apiRequest<unknown>("/api/contacts", "POST", input);
    const contact = normalizeContact(data);

    if (!contact) {
        throw new Error("Invalid contact response from server.");
    }

    return contact;
}

export async function updateContact(
    id: string,
    input: {
        walletAddress: string;
        name?: string;
        address?: string;
        note?: string | null;
    },
): Promise<Contact> {
    const data = await apiRequest<unknown>(`/api/contacts/${encodeURIComponent(id)}`, "PUT", input);
    const contact = normalizeContact(data);

    if (!contact) {
        throw new Error("Invalid contact response from server.");
    }

    return contact;
}

export async function deleteContact(id: string, walletAddress: string): Promise<void> {
    await apiRequest<null>(`/api/contacts/${encodeURIComponent(id)}`, "DELETE", {
        walletAddress,
    });
}

export function saveContacts(): void {
    return;
}

export function formatShortAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
