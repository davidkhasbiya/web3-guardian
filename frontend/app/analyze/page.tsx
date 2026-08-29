import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import TransactionBuilder from "@/components/TransactionBuilder";

export default function AnalyzePage() {
    return (
        <div className="min-h-full">
            <Header />
            <main className="mx-auto max-w-6xl px-6 py-8">
                <div className="flex flex-col gap-6 md:flex-row">
                    <Sidebar />
                    <div className="min-w-0 flex-1">
                        <TransactionBuilder />
                    </div>
                </div>
            </main>
        </div>
    );
}
