"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { type Contact, formatShortAddress } from "@/lib/contacts";

const emptyForm = {
    name: "",
    address: "",
    note: "",
};

type ApiContact = {
    id: string;
    wallet_address: string;
    name: string;
    contact_address: string;
    note: string | null;
    created_at: string;
    updated_at: string;
};

const API_URL = "http://localhost:4000";

function mapApiContact(contact: ApiContact): Contact {
    return {
        id: contact.id,
        name: contact.name,
        address: contact.contact_address,
        note: contact.note ?? undefined,
    };
}

export default function ContactsPage() {
    const { address: walletAddress, isConnected } = useAccount();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState("");
    const [loadError, setLoadError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

    useEffect(() => {
        if (!walletAddress || !isConnected) {
            return;
        }

        const currentWalletAddress: string = walletAddress;
        let cancelled = false;

        async function loadContacts() {
            setIsLoading(true);
            setLoadError("");

            try {
                const response = await fetch(
                    `${API_URL}/api/contacts?walletAddress=${encodeURIComponent(
                        currentWalletAddress,
                    )}`,
                );

                const data: unknown = await response.json();

                if (!response.ok) {
                    const message =
                        typeof data === "object" &&
                            data !== null &&
                            "error" in data &&
                            typeof data.error === "string"
                            ? data.error
                            : "Failed to load contacts.";

                    throw new Error(message);
                }

                if (!cancelled) {
                    setContacts(
                        Array.isArray(data)
                            ? data.map(mapApiContact)
                            : [],
                    );
                }
            } catch (error) {
                if (!cancelled) {
                    setLoadError(
                        error instanceof Error
                            ? error.message
                            : "Failed to load contacts.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadContacts();

        return () => {
            cancelled = true;
        };
    }, [walletAddress, isConnected]);

    const hasContacts = contacts.length > 0;

    const contactLookup = useMemo(
        () =>
            contacts.reduce<Record<string, Contact>>((all, contact) => {
                all[contact.address.toLowerCase()] = contact;
                return all;
            }, {}),
        [contacts],
    );

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const currentWalletAddress = walletAddress;

        if (!currentWalletAddress || !isConnected) {
            setFormError("Connect your wallet before adding a contact.");
            return;
        }

        const trimmedName = form.name.trim();
        const trimmedAddress = form.address.trim();
        const trimmedNote = form.note.trim();

        if (!trimmedName) {
            setFormError("Name is required.");
            return;
        }

        if (!isAddress(trimmedAddress)) {
            setFormError("Enter a valid EVM wallet address.");
            return;
        }

        if (contactLookup[trimmedAddress.toLowerCase()]) {
            setFormError("This wallet address is already in your contacts.");
            return;
        }

        setIsSaving(true);
        setFormError("");

        try {
            const response = await fetch(`${API_URL}/api/contacts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    walletAddress: currentWalletAddress,
                    name: trimmedName,
                    contactAddress: trimmedAddress,
                    note: trimmedNote || undefined,
                }),
            });

            const data: unknown = await response.json();

            if (!response.ok) {
                const message =
                    typeof data === "object" &&
                        data !== null &&
                        "error" in data &&
                        typeof data.error === "string"
                        ? data.error
                        : "Failed to save contact.";

                throw new Error(message);
            }

            setContacts((current) => [
                mapApiContact(data as ApiContact),
                ...current,
            ]);

            setForm(emptyForm);
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : "Failed to save contact.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(contactId: string) {
        setFormError("");
        setDeletingContactId(contactId);

        try {
            const response = await fetch(
                `${API_URL}/api/contacts/${encodeURIComponent(contactId)}`,
                {
                    method: "DELETE",
                },
            );

            if (!response.ok) {
                const data: unknown = await response.json().catch(() => null);

                const message =
                    typeof data === "object" &&
                        data !== null &&
                        "error" in data &&
                        typeof data.error === "string"
                        ? data.error
                        : "Failed to delete contact.";

                throw new Error(message);
            }

            setContacts((current) =>
                current.filter((contact) => contact.id !== contactId),
            );
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : "Failed to delete contact.",
            );
        } finally {
            setDeletingContactId(null);
        }
    }

    function handleCopyAddress(address: string) {
        if (typeof navigator === "undefined" || !navigator.clipboard) {
            return;
        }

        void navigator.clipboard.writeText(address);
    }

    return (
        <div className="min-h-full">
            <Header />

            <main className="mx-auto max-w-6xl px-6 py-8">
                <div className="flex flex-col gap-6 md:flex-row">
                    <Sidebar />

                    <div className="min-w-0 flex-1">
                        <section className="rounded-xl border border-border bg-card p-5">
                            <p className="text-sm text-muted">Contacts</p>

                            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                                Wallet address book
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                                Save wallet addresses with names so you don&apos;t
                                have to memorize 0x... addresses.
                            </p>

                            {!isConnected ? (
                                <div className="mt-5 rounded-lg border border-dashed border-border bg-background/20 p-4 text-sm text-muted">
                                    Connect your wallet to view and manage
                                    your contacts.
                                </div>
                            ) : null}

                            {loadError ? (
                                <p className="mt-4 text-sm text-red-400">
                                    {loadError}
                                </p>
                            ) : null}

                            {formError ? (
                                <p className="mt-4 text-sm text-red-400">
                                    {formError}
                                </p>
                            ) : null}

                            <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                                <div className="rounded-xl border border-border bg-background/40 p-4">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <h2 className="text-lg font-semibold">
                                            Saved contacts
                                        </h2>

                                        <span className="rounded-full border border-border bg-background/60 px-2 py-1 text-xs text-muted">
                                            {contacts.length} saved
                                        </span>
                                    </div>

                                    {isLoading ? (
                                        <p className="text-sm text-muted">
                                            Loading contacts...
                                        </p>
                                    ) : hasContacts ? (
                                        <div className="space-y-3">
                                            {contacts.map((contact) => (
                                                <div
                                                    key={contact.id}
                                                    className="rounded-lg border border-border bg-card/80 p-3"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-foreground">
                                                                {contact.name}
                                                            </p>

                                                            <p
                                                                className="mt-1 break-all font-mono text-xs text-muted"
                                                                title={contact.address}
                                                            >
                                                                {formatShortAddress(
                                                                    contact.address,
                                                                )}
                                                            </p>

                                                            {contact.note ? (
                                                                <p className="mt-2 text-xs leading-5 text-muted">
                                                                    {contact.note}
                                                                </p>
                                                            ) : null}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void handleDelete(
                                                                    contact.id,
                                                                )
                                                            }
                                                            disabled={
                                                                deletingContactId ===
                                                                contact.id
                                                            }
                                                            className="rounded-full border border-border px-2 py-1 text-xs text-muted hover:border-red-400/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {deletingContactId ===
                                                                contact.id
                                                                ? "Deleting..."
                                                                : "Delete"}
                                                        </button>
                                                    </div>

                                                    <div className="mt-3 flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleCopyAddress(
                                                                    contact.address,
                                                                )
                                                            }
                                                            className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
                                                        >
                                                            Copy address
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-border bg-background/20 p-4 text-sm text-muted">
                                            {isConnected
                                                ? "No contacts saved yet. Add a wallet you send to often for faster transaction setup."
                                                : "Connect your wallet to load contacts."}
                                        </div>
                                    )}
                                </div>

                                <form
                                    onSubmit={handleSubmit}
                                    className="rounded-xl border border-border bg-background/40 p-4"
                                >
                                    <h2 className="text-lg font-semibold">
                                        Add contact
                                    </h2>

                                    <div className="mt-4 space-y-4">
                                        <label className="flex flex-col gap-2 text-sm">
                                            <span className="text-muted">
                                                Name
                                            </span>

                                            <input
                                                value={form.name}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        name: event.target.value,
                                                    }))
                                                }
                                                placeholder="Alice"
                                                className="rounded-lg border border-border bg-background px-3 py-2 font-medium text-foreground outline-none placeholder:text-muted/50 focus:border-accent/60"
                                            />
                                        </label>

                                        <label className="flex flex-col gap-2 text-sm">
                                            <span className="text-muted">
                                                Wallet address
                                            </span>

                                            <input
                                                value={form.address}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        address: event.target.value,
                                                    }))
                                                }
                                                placeholder="0x..."
                                                className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted/50 focus:border-accent/60"
                                            />
                                        </label>

                                        <label className="flex flex-col gap-2 text-sm">
                                            <span className="text-muted">
                                                Note (optional)
                                            </span>

                                            <textarea
                                                value={form.note}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        note: event.target.value,
                                                    }))
                                                }
                                                className="resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/50 focus:border-accent/60"
                                            />
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!isConnected || isSaving}
                                        className="mt-5 w-full rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSaving ? "Saving..." : "Save contact"}
                                    </button>
                                </form>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}