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

      <main className="w-full px-5 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row">
          <Sidebar />

          <div className="min-w-0 flex-1">
            {/* Page Header */}
            <section className="mb-8">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent-dim">
                Settings
              </p>
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Security Settings
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                    Customize your Web3 Guardian security preferences, notifications, and wallet settings.
                  </p>
                </div>
                {savedMessage ? (
                  <div className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
                    {savedMessage}
                  </div>
                ) : null}
              </div>
            </section>

            {/* Settings Grid */}
            <div className="space-y-6">
              {/* Security Preferences Section */}
              <section className="rounded-xl border border-border bg-card p-6">
                <div className="mb-6 border-b border-border pb-4">
                  <h2 className="text-lg font-semibold">Security Preferences</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Control the security review experience used by Web3 Guardian.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Risk Alert Threshold */}
                  <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-background/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Risk alert threshold
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Score at or above this level should be treated as requiring extra attention.
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
                      className="shrink-0 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium outline-none transition-colors focus:border-accent/60 hover:border-border/80"
                    >
                      <option value={50}>50 / 100</option>
                      <option value={70}>70 / 100</option>
                      <option value={80}>80 / 100</option>
                    </select>
                  </div>

                  {/* Require Review Before Recording */}
                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/30 p-4 transition-colors hover:border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Require review before recording
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Keep the assessment review step before an on-chain assessment can be recorded.
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
                      className="mt-1 h-5 w-5 shrink-0 accent-accent"
                    />
                  </label>

                  {/* Show AI Safety Disclaimer */}
                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/30 p-4 transition-colors hover:border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
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
                      className="mt-1 h-5 w-5 shrink-0 accent-accent"
                    />
                  </label>
                </div>
              </section>

              {/* Notifications Section */}
              <section className="rounded-xl border border-border bg-card p-6">
                <div className="mb-6 border-b border-border pb-4">
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Choose which local Guardian notifications are enabled.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Security Alerts */}
                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/30 p-4 transition-colors hover:border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
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
                      className="mt-1 h-5 w-5 shrink-0 accent-accent"
                    />
                  </label>

                  {/* Assessment Recorded */}
                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/30 p-4 transition-colors hover:border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Assessment recorded
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Show a confirmation when an assessment is successfully recorded on-chain.
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
                      className="mt-1 h-5 w-5 shrink-0 accent-accent"
                    />
                  </label>
                </div>
              </section>

              {/* Wallet Preferences Section */}
              <section className="rounded-xl border border-border bg-card p-6">
                <div className="mb-6 border-b border-border pb-4">
                  <h2 className="text-lg font-semibold">Wallet Preferences</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Review the wallet and network currently used by Web3 Guardian.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Wallet Info Cards */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/50 bg-background/30 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
                        Connected wallet
                      </p>
                      <p className="mt-3 break-all font-mono text-sm font-medium text-foreground">
                        {isConnected ? shortAddress : "Not connected"}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/30 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
                        Current network
                      </p>
                      <p className="mt-3 font-mono text-sm font-medium text-foreground">
                        {networkName}
                      </p>
                      {chainId !== GUARDIAN_CHAIN_ID ? (
                        <p className="mt-2 text-xs text-yellow-400">
                          ⚠️ Switch to BNB Smart Chain Testnet for on-chain recording.
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-accent">
                          ✓ Correct network
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Remember Last Contact */}
                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/30 p-4 transition-colors hover:border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Remember last selected contact
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Keep contact selection available for faster transaction preparation.
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
                      className="mt-1 h-5 w-5 shrink-0 accent-accent"
                    />
                  </label>
                </div>
              </section>

              {/* Local Data Section */}
              <section className="rounded-xl border border-border bg-card p-6">
                <div className="mb-6 border-b border-border pb-4">
                  <h2 className="text-lg font-semibold">Local Data</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Manage preferences stored in this browser. Blockchain records are not affected by these actions.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleResetSettings}
                    className="rounded-lg border border-border bg-card/50 px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-accent/50 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    Restore defaults
                  </button>

                  <button
                    type="button"
                    onClick={handleClearContacts}
                    disabled={savedContactsCount === 0}
                    className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 hover:border-red-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-500/5 disabled:hover:border-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  >
                    Clear saved contacts {savedContactsCount > 0 && `(${savedContactsCount})`}
                  </button>
                </div>
              </section>

              {/* Info Footer */}
              <div className="rounded-lg border border-border/30 bg-background/20 p-4">
                <p className="text-xs leading-6 text-muted">
                  <span className="font-medium">Note:</span> Settings are stored locally in your browser. Wallet connection, AI analysis, and blockchain recording remain controlled by the respective Web3 Guardian flows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}