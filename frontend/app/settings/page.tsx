import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function SettingsPage() {
    return (
        <div className="min-h-full">
            <Header />
            <main className="mx-auto max-w-6xl px-6 py-8">
                <div className="flex flex-col gap-6 md:flex-row">
                    <Sidebar />
                    <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-5">
                        <p className="text-sm text-muted">Settings</p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Guardian preferences</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                            Settings are not implemented yet. This section is reserved for safety thresholds,
                            notifications, and wallet preferences.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
