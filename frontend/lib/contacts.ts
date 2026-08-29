import { isAddress } from "viem";

export type Contact = {
    id: string;
    name: string;
    address: string;
    note?: string;
};

export const CONTACTS_STORAGE_KEY = "web3-guardian-contacts";

function sanitizeContact(candidate: unknown): Contact | null {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
        return null;
    }

    const contact = candidate as Partial<Contact>;

    if (
        typeof contact.id !== "string" ||
        typeof contact.name !== "string" ||
        typeof contact.address !== "string" ||
        !isAddress(contact.address)
    ) {
        return null;
    }

    return {
        id: contact.id,
        name: contact.name.trim(),
        address: contact.address,
        note: typeof contact.note === "string" ? contact.note.trim() : undefined,
    };
}

export function getContacts(): Contact[] {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const rawContacts = window.localStorage.getItem(CONTACTS_STORAGE_KEY);
        if (!rawContacts) {
            return [];
        }

        const parsedContacts = JSON.parse(rawContacts);
        if (!Array.isArray(parsedContacts)) {
            return [];
        }

        return parsedContacts
            .map((candidate) => sanitizeContact(candidate))
            .filter((contact): contact is Contact => contact !== null);
    } catch {
        return [];
    }
}

export function saveContacts(contacts: Contact[]) {
    if (typeof window === "undefined") {
        return;
    }

    const sanitized = contacts
        .map((contact) => ({
            id: contact.id,
            name: contact.name.trim(),
            address: contact.address,
            note: contact.note ? contact.note.trim() : undefined,
        }))
        .filter((contact) => contact.name.length > 0 && isAddress(contact.address));

    window.localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(sanitized));
}

export function formatShortAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
