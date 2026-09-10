"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import {
    type Contact,
    createContact,
    deleteContact,
    getContacts,
} from "@/lib/contacts";

const emptyForm = {
    name: "",
    address: "",
    note: "",
};

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

        let cancelled = false;

        async function loadContacts() {
            setIsLoading(true);
            setLoadError("");

            try {
                const currentWalletAddress = walletAddress;
                if (!currentWalletAddress) {
                    return;
                }

                const nextContacts = await getContacts(currentWalletAddress);

                if (!cancelled) {
                    setContacts(nextContacts);
                }
            } catch (error) {
                if (!cancelled) {
                    setLoadError(
                        error instanceof Error
                            ? error.message
                            : "Failed to load contacts.",
                    );
                    setContacts([]);
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
            const nextContact = await createContact({
                walletAddress: currentWalletAddress,
                name: trimmedName,
                address: trimmedAddress,
                note: trimmedNote || undefined,
            });

            setContacts((current) => [nextContact, ...current]);
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
        if (!walletAddress || !isConnected) {
            setFormError("Connect your wallet before deleting a contact.");
            return;
        }

        setFormError("");
        setDeletingContactId(contactId);

        try {
            await deleteContact(contactId, walletAddress);
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

            <main className="w-full px-5 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-6 md:flex-row">
                    <Sidebar />

                    <div className="min-w-0 flex-1">
                        {/* Page Header */}
                        <section className="mb-8">
                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent-dim">
                                Contacts
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                Trusted Contacts
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                                Save and organize wallet addresses you send to often. Trusted contacts make it easier to verify recipients and set up transactions securely.
                            </p>
                        </section>

                        {!isConnected ? (
                            <div className="rounded-lg border border-dashed border-border bg-background/30 p-5">
                                <p className="text-sm text-muted">
                                    Connect your wallet to view and manage your trusted contacts.
                                </p>
                            </div>
                        ) : null}

                        {loadError ? (
                            <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4">
                                <p className="text-sm text-red-400">
                                    {loadError}
                                </p>
                            </div>
                        ) : null}

                        {formError ? (
                            <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4">
                                <p className="text-sm text-red-400">
                                    {formError}
                                </p>
                            </div>
                        ) : null}

                        {/* Add Contact Button */}
                        <div className="mb-8">
                            {isConnected && !isLoading ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const form = document.getElementById("add-contact-form");
                                        if (form) {
                                            form.scrollIntoView({ behavior: "smooth" });
                                        }
                                    }}
                                    className="rounded-lg border border-accent/40 bg-accent/10 px-6 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-accent/20 hover:shadow-lg hover:shadow-accent/20"
                                >
                                    + Add Contact
                                </button>
                            ) : null}
                        </div>

                        {/* Contacts Section */}
                        {isConnected ? (
                            <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                                {/* Contacts List */}
                                <div className="order-2 lg:order-1">
                                    <div className="rounded-lg border border-border bg-card p-6">
                                        <div className="mb-6 flex items-center justify-between gap-3">
                                            <h2 className="text-lg font-semibold text-foreground">
                                                Saved Contacts
                                            </h2>

                                            {!isLoading && hasContacts ? (
                                                <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-accent">
                                                    {contacts.length}
                                                </span>
                                            ) : null}
                                        </div>

                                        {isLoading ? (
                                            <p className="text-sm text-muted">
                                                Loading contacts...
                                            </p>
                                        ) : hasContacts ? (
                                            <div className="space-y-4">
                                                {contacts.map((contact) => (
                                                    <div
                                                        key={contact.id}
                                                        className="group rounded-lg border border-border bg-background/40 p-4 transition-colors hover:border-border hover:bg-background/60"
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-medium text-foreground">
                                                                    {contact.name}
                                                                </p>

                                                                <p
                                                                    className="mt-1 break-all font-mono text-xs text-muted"
                                                                    title={contact.address}
                                                                >
                                                                    {contact.address}
                                                                </p>

                                                                {contact.note ? (
                                                                    <p className="mt-2 text-xs leading-5 text-muted">
                                                                        {contact.note}
                                                                    </p>
                                                                ) : null}
                                                            </div>

                                                            <div className="flex flex-shrink-0 gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleCopyAddress(
                                                                            contact.address,
                                                                        )
                                                                    }
                                                                    className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-all hover:bg-accent/20"
                                                                    title="Copy address"
                                                                >
                                                                    Copy
                                                                </button>

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
                                                                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-red-400/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    {deletingContactId ===
                                                                        contact.id
                                                                        ? "Deleting..."
                                                                        : "Delete"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-border bg-background/30 p-6 text-center">
                                                <p className="text-sm text-muted">
                                                    No trusted contacts yet
                                                </p>
                                                <p className="mt-2 text-xs text-muted">
                                                    Add wallet addresses you send to often for easier transaction setup.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Add Contact Form */}
                                <form
                                    id="add-contact-form"
                                    onSubmit={handleSubmit}
                                    className="order-1 lg:order-2 rounded-lg border border-border bg-card p-6"
                                >
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Add New Contact
                                    </h2>

                                    <div className="mt-6 space-y-4">
                                        <label className="flex flex-col gap-2 text-sm">
                                            <span className="font-medium text-muted">
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
                                                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
                                            />
                                        </label>

                                        <label className="flex flex-col gap-2 text-sm">
                                            <span className="font-medium text-muted">
                                                Wallet Address
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
                                                className="rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
                                            />
                                        </label>

                                        <label className="flex flex-col gap-2 text-sm">
                                            <span className="font-medium text-muted">
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
                                                placeholder="Who is this contact? Where do you typically send funds?"
                                                rows={3}
                                                className="resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
                                            />
                                        </label>
                                    </div>

                                    <div className="mt-6 flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={!isConnected || isSaving}
                                            className="flex-1 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-accent/20 hover:shadow-lg hover:shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                                        >
                                            {isSaving ? "Saving..." : "Save Contact"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setForm(emptyForm)}
                                            disabled={isSaving}
                                            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:border-border hover:bg-background/60 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}
