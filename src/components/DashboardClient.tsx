"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { Application, ApplicationStatus, Reminder } from "@/types";
import { useApplications } from "@/hooks/useApplications";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import ApplicationModal from "@/components/kanban/ApplicationModal";
import ApplicationForm from "@/components/forms/ApplicationForm";
import { generateApplicationsPdf } from "@/lib/pdf";

const STATUS_FILTERS: Array<{ value: ApplicationStatus | "ALL"; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "WISHLIST", label: "Wishlist" },
    { value: "APPLIED", label: "Applied" },
    { value: "SCREENING", label: "Screening" },
    { value: "INTERVIEW", label: "Interview" },
    { value: "OFFER", label: "Offer" },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "REJECTED", label: "Rejected" },
];

type ReminderWithApp = Reminder & {
    application: { id: string; company: string; role: string; status: ApplicationStatus };
};

export default function DashboardClient({ userName }: { userName: string }) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL");

    const {
        applications, loading, error,
        createApplication, updateApplication, deleteApplication,
    } = useApplications({ search, status: statusFilter });

    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Reminders bell state
    const [reminders, setReminders] = useState<ReminderWithApp[]>([]);
    const [bellOpen, setBellOpen] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);

    const fetchReminders = async () => {
        try {
            const res = await fetch("/api/reminders");
            if (!res.ok) return;
            const data = await res.json();
            setReminders(data);
        } catch {
            // silent — bell just won't show a count
        }
    };

    // Initial load + poll every 60s so the bell stays current
    useEffect(() => {
        fetchReminders();
        const interval = setInterval(fetchReminders, 60_000);
        return () => clearInterval(interval);
    }, []);

    // Refresh reminders whenever the application modal closes (might have edited reminders)
    useEffect(() => {
        if (selectedApp === null) fetchReminders();
    }, [selectedApp]);

    // Click outside to close the dropdown
    useEffect(() => {
        if (!bellOpen) return;
        const handler = (e: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
                setBellOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [bellOpen]);

    const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
        await updateApplication(id, { status: newStatus });
    };

    const handleExportPdf = () => {
        generateApplicationsPdf({
            userName,
            applications,
        });
    };

    const handleMarkReminderDone = async (reminderId: string) => {
        // Optimistic
        setReminders((prev) => prev.filter((r) => r.id !== reminderId));
        try {
            await fetch(`/api/reminders/${reminderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sent: true }),
            });
        } catch {
            await fetchReminders(); // refetch on failure to roll back
        }
    };

    const openApplicationFromReminder = (appId: string) => {
        const app = applications.find((a) => a.id === appId);
        if (app) {
            setSelectedApp(app);
            setBellOpen(false);
        }
    };

    const activeCount = applications.filter(
        (a) => !["REJECTED", "ACCEPTED", "WISHLIST"].includes(a.status)
    ).length;
    const interviewCount = applications.filter((a) => a.status === "INTERVIEW").length;
    const offerCount = applications.filter((a) => a.status === "OFFER").length;

    const isFiltering = search.length > 0 || statusFilter !== "ALL";

    // Bucket reminders into "due now" vs "upcoming" for the dropdown
    const now = new Date();
    const dueNow = reminders.filter((r) => new Date(r.remindAt) <= now);
    const upcoming = reminders.filter((r) => new Date(r.remindAt) > now);
    const bellBadgeCount = dueNow.length;

    const formatRelative = (date: string | Date) => {
        const d = new Date(date);
        const diffMs = d.getTime() - now.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
            return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
        }
        if (diffDays === 1) return "Tomorrow";
        if (diffDays === -1) return "Yesterday";
        if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;
        if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;
        return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    };

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Header */}
            <div className="border-b border-gray-800 px-6 py-4">
                <div className="max-w-full flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-semibold text-white">JobTracker</h1>
                        <nav className="flex gap-1">
                            <span className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 text-white">Board</span>
                            <a href="/dashboard/analytics" className="text-sm px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition-colors">Analytics</a>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportPdf}
                            disabled={applications.length === 0}
                            className="text-sm px-3 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-white rounded-lg font-medium transition-colors flex items-center gap-1.5"
                            title={applications.length === 0 ? "No applications to export" : "Export PDF report"}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Export
                        </button>
                        {/* Reminders bell */}
                        <div className="relative" ref={bellRef}>
                            <button
                                onClick={() => setBellOpen((v) => !v)}
                                className="relative w-9 h-9 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                                aria-label="Reminders"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                                </svg>
                                {bellBadgeCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                                        {bellBadgeCount > 9 ? "9+" : bellBadgeCount}
                                    </span>
                                )}
                            </button>

                            {bellOpen && (
                                <div className="absolute right-0 top-11 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 max-h-[500px] overflow-y-auto">
                                    <div className="px-4 py-3 border-b border-gray-800">
                                        <p className="text-sm font-medium text-white">Reminders</p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            {reminders.length === 0
                                                ? "No reminders set"
                                                : `${dueNow.length} due now, ${upcoming.length} upcoming`}
                                        </p>
                                    </div>

                                    {reminders.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-xs text-gray-500">
                                            Add reminders from inside any application card.
                                        </div>
                                    ) : (
                                        <div className="py-1">
                                            {dueNow.length > 0 && (
                                                <>
                                                    <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wide text-red-400">Due now</p>
                                                    {dueNow.map((r) => (
                                                        <ReminderRow
                                                            key={r.id}
                                                            reminder={r}
                                                            relativeLabel={formatRelative(r.remindAt)}
                                                            overdue
                                                            onOpen={() => openApplicationFromReminder(r.application.id)}
                                                            onDone={() => handleMarkReminderDone(r.id)}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                            {upcoming.length > 0 && (
                                                <>
                                                    <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wide text-gray-500">Upcoming</p>
                                                    {upcoming.map((r) => (
                                                        <ReminderRow
                                                            key={r.id}
                                                            reminder={r}
                                                            relativeLabel={formatRelative(r.remindAt)}
                                                            overdue={false}
                                                            onOpen={() => openApplicationFromReminder(r.application.id)}
                                                            onDone={() => handleMarkReminderDone(r.id)}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button onClick={() => setShowForm(true)}
                            className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
                            + Add application
                        </button>
                        <span className="text-sm text-gray-400">{userName}</span>
                        <button onClick={() => signOut({ callbackUrl: "/login" })}
                            className="text-sm text-gray-500 hover:text-white transition-colors">Logout</button>
                    </div>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="px-6 pt-4 pb-2">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[240px] max-w-sm">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search company or role..."
                            className="w-full pl-9 pr-9 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">⌕</span>
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded text-gray-500 hover:text-white hover:bg-gray-800 flex items-center justify-center text-xs transition-colors"
                                aria-label="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="flex gap-1 flex-wrap">
                        {STATUS_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => setStatusFilter(f.value)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${statusFilter === f.value
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-6 py-3">
                <div className="grid grid-cols-4 gap-3 max-w-xl">
                    <div className="bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-lg font-medium text-white">{applications.length}</p>
                        <p className="text-[11px] text-gray-500">{isFiltering ? "Showing" : "Total"}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-lg font-medium text-white">{activeCount}</p>
                        <p className="text-[11px] text-gray-500">Active</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-lg font-medium text-white">{interviewCount}</p>
                        <p className="text-[11px] text-gray-500">Interviews</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-lg font-medium text-white">{offerCount}</p>
                        <p className="text-[11px] text-gray-500">Offers</p>
                    </div>
                </div>
            </div>

            {/* Board */}
            <div className="px-6 pb-8">
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading...</div>
                ) : error ? (
                    <div className="text-center py-20 text-red-400">{error}</div>
                ) : applications.length === 0 && isFiltering ? (
                    <div className="text-center py-20 text-gray-500 text-sm">
                        No applications match your filters.{" "}
                        <button
                            onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
                            className="text-blue-400 hover:text-blue-300"
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <KanbanBoard
                        applications={applications}
                        onStatusChange={handleStatusChange}
                        onCardClick={setSelectedApp}
                    />
                )}
            </div>

            {/* Modals */}
            {selectedApp && (
                <ApplicationModal
                    application={selectedApp}
                    onClose={() => setSelectedApp(null)}
                    onUpdate={updateApplication}
                    onDelete={deleteApplication}
                />
            )}

            {showForm && (
                <ApplicationForm
                    onSubmit={createApplication}
                    onClose={() => setShowForm(false)}
                />
            )}
        </div>
    );
}

// Internal subcomponent — keeps the bell rendering tidy
function ReminderRow({
    reminder, relativeLabel, overdue, onOpen, onDone,
}: {
    reminder: ReminderWithApp;
    relativeLabel: string;
    overdue: boolean;
    onOpen: () => void;
    onDone: () => void;
}) {
    return (
        <div className="px-4 py-2.5 hover:bg-gray-800/50 transition-colors group">
            <div className="flex items-start gap-2">
                <button
                    onClick={onOpen}
                    className="flex-1 min-w-0 text-left"
                >
                    <p className={`text-xs ${overdue ? "text-red-300" : "text-white"} truncate`}>
                        {reminder.message}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {reminder.application.company} · {relativeLabel}
                    </p>
                </button>
                <button
                    onClick={onDone}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-green-400 transition-all text-xs px-1"
                    title="Mark done"
                >
                    ✓
                </button>
            </div>
        </div>
    );
}