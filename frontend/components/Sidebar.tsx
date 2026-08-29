'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/analyze", label: "Risk Analyzer", icon: "analyze" },
    { href: "/contacts", label: "Contacts", icon: "contacts" },
    { href: "/history", label: "Assessment History", icon: "history" },
    { href: "/settings", label: "Settings", icon: "settings" },
] as const;

function Icon({ type }: { type: (typeof navItems)[number]["icon"] }) {
    const commonProps = {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        className: "h-4 w-4",
    };

    switch (type) {
        case "dashboard":
            return (
                <svg {...commonProps}>
                    <path d="M4 13.5V5.5A1.5 1.5 0 0 1 5.5 4H9v7.5H4ZM4 13.5h8.5V20H5.5A1.5 1.5 0 0 1 4 18.5v-5ZM10.5 20V9.5H18.5A1.5 1.5 0 0 1 20 11v7.5A1.5 1.5 0 0 1 18.5 20h-8Z" />
                    <path d="M10.5 4h8A1.5 1.5 0 0 1 20 5.5V9.5h-9.5V4Z" />
                </svg>
            );
        case "analyze":
            return (
                <svg {...commonProps}>
                    <path d="M7 15.5 4.5 18l2.5 2.5M17 8.5 19.5 6 17 3.5M12 4v16M4.5 12h15" />
                </svg>
            );
        case "contacts":
            return (
                <svg {...commonProps}>
                    <path d="M8 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 18c.8-2.2 3.1-3.5 6-3.5s5.2 1.3 6 3.5" />
                    <path d="M15.5 7.5h4M17.5 5.5v4M18 16.5c1.2 0 2.2 1 2.2 2.2V18" />
                </svg>
            );
        case "history":
            return (
                <svg {...commonProps}>
                    <path d="M3.5 12a8.5 8.5 0 1 0 3-6.5" />
                    <path d="M3.5 4v5h5" />
                    <path d="M12 7v5l3.5 2" />
                </svg>
            );
        case "settings":
            return (
                <svg {...commonProps}>
                    <path d="M12 3.5v3M12 17.5v3M4.5 12h3M16.5 12h3M6.7 6.7l2.1 2.1M15.2 15.2l2.1 2.1M17.3 6.7l-2.1 2.1M8.8 15.2l-2.1 2.1" />
                    <circle cx="12" cy="12" r="3.5" />
                </svg>
            );
        default:
            return null;
    }
}

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-full md:w-72 md:flex-none">
            <div className="rounded-xl border border-border bg-card p-3">
                <nav className="space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={[
                                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                                    isActive
                                        ? "border-accent/40 bg-accent/10 text-accent"
                                        : "border-transparent text-muted hover:border-border hover:bg-background/60 hover:text-foreground",
                                ].join(" ")}
                            >
                                <span
                                    className={[
                                        "flex h-8 w-8 items-center justify-center rounded-md border",
                                        isActive
                                            ? "border-accent/30 bg-accent/10 text-accent"
                                            : "border-border bg-background/60 text-muted",
                                    ].join(" ")}
                                >
                                    <Icon type={item.icon} />
                                </span>
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
