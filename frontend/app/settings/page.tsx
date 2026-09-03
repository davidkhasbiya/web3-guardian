"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { GUARDIAN_CHAIN_ID } from "@/lib/guardianContract";
import { deleteContact, getContacts } from "@/lib/contacts";

const SETTINGS_KEY = "web3guardian_settings";

type GuardianSettings = {
  riskAlertThreshold: number;
  requireReviewBeforeRecording: boolean;
  showAiDisclaimer: boolean;
  securityAlerts: boolean;
  assessmentNotifications: boolean;
  rememberLastContact: boolean;
};

const DEFAULT_SETTINGS: GuardianSettings = {
  riskAlertThreshold: 70,
  requireReviewBeforeRecording: true,
  showAiDisclaimer: true,
  securityAlerts: true,
  assessmentNotifications: true,
  rememberLastContact: true,
};

function loadSettings(): GuardianSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);

    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed: Partial<GuardianSettings> = JSON.parse(stored);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: GuardianSettings) {
  window.localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(settings),
  );
}

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [settings, setSettings] = useState<GuardianSettings>(
    loadSettings,
  );
  const [savedMessage, setSavedMessage] = useState("");
  const [savedContactsCount, setSavedContactsCount] = useState(0);

  useEffect(() => {
    if (!address || !isConnected) {
      queueMicrotask(() => {
        setSavedContactsCount(0);
      });
      return;
    }

    let cancelled = false;

    void getContacts(address)
      .then((contacts) => {
        if (!cancelled) {
          setSavedContactsCount(contacts.length);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSavedContactsCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  function showSavedMessage(message: string) {
    setSavedMessage(message);

    window.setTimeout(() => {
      setSavedMessage("");
    }, 1800);
  }

  function updateSetting<K extends keyof GuardianSettings>(
    key: K,
    value: GuardianSettings[K],
  ) {
    setSettings((currentSettings) => {
      const nextSettings = {
        ...currentSettings,
        [key]: value,
      };

      saveSettings(nextSettings);

      return nextSettings;
    });

    showSavedMessage("Settings saved");
  }

  function handleResetSettings() {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    showSavedMessage("Settings restored to default");
  }

  async function handleClearContacts() {
    if (!address || !isConnected) {
      showSavedMessage("Connect your wallet to clear contacts");
      return;
    }

    try {
      const contacts = await getContacts(address);

      await Promise.all(
        contacts.map((contact) => deleteContact(contact.id, address)),
      );

      showSavedMessage("Saved contacts cleared");
    } catch {
      showSavedMessage("Failed to clear contacts");
    }
  }

  const networkName =
    chainId === GUARDIAN_CHAIN_ID
      ? "BNB Smart Chain Testnet"
      : `Chain ID ${chainId}`;

  const shortAddress =
    address && address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address ?? "Not connected";


  return (
    <div className="min-h-full">
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-6 md:flex-row">
          <Sidebar />

          <div className="min-w-0 flex-1 space-y-5">
            {/* Header */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-muted">Settings</p>

                  <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                    Guardian preferences
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                    Configure how Web3 Guardian presents security warnings,
                    notifications, and wallet preferences.
                  </p>
                </div>

                {savedMessage ? (
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
                    {savedMessage}
                  </span>
                ) : null}
              </div>
            </section>

            {/* Security */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div>
                <p className="text-sm font-medium text-accent">
                  Security preferences
                </p>

                <p className="mt-1 text-sm leading-6 text-muted">
                  Control the security review experience used by Guardian.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Risk alert threshold
                      </p>

                      <p className="mt-1 text-xs leading-5 text-muted">
                        Score at or above this level should be treated as
                        requiring extra attention.
                      </p>
                    </div>

                    <select
                      value={settings.riskAlertThreshold}
                      onChange={(event) =>
                        updateSetting(
                          "riskAlertThreshold",
                          Number(event.target.value),
                        )
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
                    >
                      <option value={50}>50 / 100</option>
                      <option value={70}>70 / 100</option>
                      <option value={80}>80 / 100</option>
                    </select>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background/40 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      Require review before recording
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted">
                      Keep the assessment review step before an on-chain
                      assessment can be recorded.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={settings.requireReviewBeforeRecording}
                    onChange={(event) =>
                      updateSetting(
                        "requireReviewBeforeRecording",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 accent-current"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background/40 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      Show AI safety disclaimer
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted">
                      Explain that AI analysis is not a safety guarantee.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={settings.showAiDisclaimer}
                    onChange={(event) =>
                      updateSetting(
                        "showAiDisclaimer",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 accent-current"
                  />
                </label>
              </div>
            </section>

            {/* Notifications */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div>
                <p className="text-sm font-medium text-accent">
                  Notifications
                </p>

                <p className="mt-1 text-sm leading-6 text-muted">
                  Choose which local Guardian notifications are enabled.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background/40 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      Security alerts
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted">
                      Enable alerts for elevated transaction risk.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={settings.securityAlerts}
                    onChange={(event) =>
                      updateSetting(
                        "securityAlerts",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 accent-current"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background/40 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      Assessment recorded
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted">
                      Show a confirmation when an assessment is successfully
                      recorded on-chain.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={settings.assessmentNotifications}
                    onChange={(event) =>
                      updateSetting(
                        "assessmentNotifications",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 accent-current"
                  />
                </label>
              </div>
            </section>

            {/* Wallet */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div>
                <p className="text-sm font-medium text-accent">
                  Wallet preferences
                </p>

                <p className="mt-1 text-sm leading-6 text-muted">
                  Review the wallet and network currently used by Guardian.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <p className="text-xs text-muted">
                    Connected wallet
                  </p>

                  <p className="mt-2 break-all font-mono text-sm">
                    {isConnected ? shortAddress : "Not connected"}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <p className="text-xs text-muted">
                    Current network
                  </p>

                  <p className="mt-2 font-mono text-sm">
                    {networkName}
                  </p>

                  {chainId !== GUARDIAN_CHAIN_ID ? (
                    <p className="mt-2 text-xs text-red-400">
                      Switch to BNB Smart Chain Testnet for on-chain
                      assessment recording.
                    </p>
                  ) : null}
                </div>
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background/40 p-4">
                <div>
                  <p className="text-sm font-medium">
                    Remember last selected contact
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted">
                    Keep contact selection available for faster transaction
                    preparation.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={settings.rememberLastContact}
                  onChange={(event) =>
                    updateSetting(
                      "rememberLastContact",
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-current"
                />
              </label>
            </section>

            {/* Local data */}
            <section className="rounded-xl border border-border bg-card p-5">
              <div>
                <p className="text-sm font-medium text-accent">
                  Local data
                </p>

                <p className="mt-1 text-sm leading-6 text-muted">
                  Manage preferences stored in this browser. Blockchain
                  records are not deleted by these actions.
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent/40 hover:text-accent"
                >
                  Restore defaults
                </button>

                <button
                  type="button"
                  onClick={handleClearContacts}
                  disabled={savedContactsCount === 0}
                  className="rounded-full border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear saved contacts
                </button>
              </div>
            </section>

            <p className="px-1 text-xs leading-5 text-muted">
              Settings are stored locally in your browser. Wallet connection,
              AI analysis, and blockchain recording remain controlled by the
              respective Web3 Guardian flows.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}