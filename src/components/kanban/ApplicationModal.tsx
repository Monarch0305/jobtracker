"use client";

import { useState, useEffect, useCallback } from "react";
import { Application, ApplicationStatus, Activity, Reminder } from "@/types";
import ApplicationForm from "@/components/forms/ApplicationForm";
import ReminderForm from "@/components/forms/ReminderForm";

type FullApplication = Application & {
    activities?: Activity[];
    reminders?: Reminder[];
};

interface ApplicationModalProps {
    application: Application;
    onClose: () => void;
    onUpdate: (id: string, data: Partial<Application>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const STATUS_OPTIONS: ApplicationStatus[] = [
    "REJECTED", "WISHLIST", "APPLIED", "SCREENING", "INTERVIEW", "OFFER", "ACCEPTED",
];

const statusColors: Record<ApplicationStatus, string> = {
    REJECTED: "bg-red-900/50 text-red-300 border-red-700",
    WISHLIST: "bg-gray-800 text-gray-300 border-gray-600",
    APPLIED: "bg-blue-900/50 text-blue-300 border-blue-700",
    SCREENING: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    INTERVIEW: "bg-teal-900/50 text-teal-300 border-teal-700",
    OFFER: "bg-green-900/50 text-green-300 border-green-700",
    ACCEPTED: "bg-purple-900/50 text-purple-300 border-purple-700",
};

const priorityColors: Record<string, string> = {
    HIGH: "bg-red-900/50 text-red-300",
    MEDIUM: "bg-yellow-900/50 text-yellow-300",
    LOW: "bg-green-900/50 text-green-300",
};

export default function ApplicationModal({
    application, onClose, onUpdate, onDelete,
}: ApplicationModalProps) {
    const [fullApp, setFullApp] = useState<FullApplication>(application);
    const [deleting, setDeleting] = useState(false);
    const [editing, setEditing] = useState(false);
    const [showReminderForm, setShowReminderForm] = useState(false);

    const refetch = useCallback(async () => {
        try {
            const res = await fetch(`/api/applications/${application.id}`);
            const data = await res.json();
            setFullApp(data);
        } catch {
            // silent — keep stale data rather than blowing up the modal
        }
    }, [application.id]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    const handleStatusChange = async (newStatus: ApplicationStatus) => {
        await onUpdate(application.id, { status: newStatus });
        setFullApp((prev) => ({ ...prev, status: newStatus }));
        await refetch();
    };

    const handleDelete = async () => {
        if (!confirm("Delete this application?")) return;
        setDeleting(true);
        await onDelete(application.id);
        onClose();
    };

    const handleEditSubmit = async (data: Record<string, unknown>) => {
        await onUpdate(application.id, data as Partial<Application>);
        await refetch();
        setEditing(false);
    };

    const handleReminderCreate = async (data: {
        applicationId: string;
        remindAt: string;
        message: string;
    }) => {
        const res = await fetch("/api/reminders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to create reminder");
        }
        await refetch();
    };

    const handleReminderMarkDone = async (reminderId: string) => {
        // Optimistic — flip locally, sync after
        setFullApp((prev) => ({
            ...prev,
            reminders: prev.reminders?.filter((r) => r.id !== reminderId),
        }));
        try {
            const res = await fetch(`/api/reminders/${reminderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sent: true }),
            });
            if (!res.ok) throw new Error();
        } catch {
            await refetch(); // roll back via fresh data
        }
    };

    const handleReminderDelete = async (reminderId: string) => {
        if (!confirm("Delete this reminder?")) return;
        setFullApp((prev) => ({
            ...prev,
            reminders: prev.reminders?.filter((r) => r.id !== reminderId),
        }));
        try {
            const res = await fetch(`/api/reminders/${reminderId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error();
        } catch {
            await refetch();
        }
    };

    const formatDate = (date: string | Date) =>
        new Date(date).toLocaleDateString("en-IN", {
            month: "short", day: "numeric", year: "numeric",
        });

    const formatDateTime = (date: string | Date) =>
        new Date(date).toLocaleString("en-IN", {
            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
        });

    const upcomingReminders = (fullApp.reminders ?? []).filter((r) => !r.sent);

    // Edit mode — render the form instead of the detail view
    if (editing) {
        return (
            <ApplicationForm
                mode="edit"
                initialData={fullApp}
                onSubmit={handleEditSubmit}
                onClose={() => setEditing(false)}
            />
        );
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-start justify-between p-5 border-b border-gray-800">
                        <div>
                            <h2 className="text-lg font-medium text-white">{fullApp.company}</h2>
                            <p className="text-sm text-gray-400 mt-0.5">{fullApp.role}</p>
                        </div>
                        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-colors">✕</button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-5">
                        {/* Status + Priority */}
                        <div className="flex items-center gap-3">
                            <select value={fullApp.status} onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer appearance-none ${statusColors[fullApp.status]}`}>
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s} className="bg-gray-900 text-white">
                                        {s.charAt(0) + s.slice(1).toLowerCase()}
                                    </option>
                                ))}
                            </select>
                            <span className={`text-xs px-2.5 py-1 rounded-full ${priorityColors[fullApp.priority]}`}>
                                {fullApp.priority.charAt(0) + fullApp.priority.slice(1).toLowerCase()} priority
                            </span>
                        </div>

                        {/* Reminders section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Reminders</p>
                                <button
                                    onClick={() => setShowReminderForm(true)}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    + Add reminder
                                </button>
                            </div>
                            {upcomingReminders.length === 0 ? (
                                <p className="text-xs text-gray-600 italic">No upcoming reminders.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {upcomingReminders.map((r) => {
                                        const isOverdue = new Date(r.remindAt) < new Date();
                                        return (
                                            <div
                                                key={r.id}
                                                className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${isOverdue
                                                        ? "border-red-900 bg-red-900/10"
                                                        : "border-yellow-900 bg-yellow-900/10"
                                                    }`}
                                            >
                                                <span className={`text-xs mt-0.5 ${isOverdue ? "text-red-400" : "text-yellow-400"}`}>
                                                    ⏰
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs ${isOverdue ? "text-red-300" : "text-yellow-300"}`}>
                                                        {r.message}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                                        {isOverdue ? "Overdue — " : ""}{formatDateTime(r.remindAt)}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleReminderMarkDone(r.id)}
                                                        className="text-[11px] text-gray-500 hover:text-green-400 transition-colors px-1.5"
                                                        title="Mark done"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={() => handleReminderDelete(r.id)}
                                                        className="text-[11px] text-gray-500 hover:text-red-400 transition-colors px-1.5"
                                                        title="Delete"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {(fullApp.salaryMin || fullApp.salaryMax) && (
                                <div>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Salary range</p>
                                    <p className="text-sm text-white mt-0.5">
                                        {fullApp.salaryMin && fullApp.salaryMax ? `${fullApp.salaryMin} - ${fullApp.salaryMax} LPA`
                                            : fullApp.salaryMin ? `${fullApp.salaryMin}+ LPA` : `Up to ${fullApp.salaryMax} LPA`}
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Applied on</p>
                                <p className="text-sm text-white mt-0.5">{formatDate(fullApp.appliedAt)}</p>
                            </div>
                            {fullApp.contactName && (
                                <div>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Contact</p>
                                    <p className="text-sm text-white mt-0.5">{fullApp.contactName}</p>
                                </div>
                            )}
                            {fullApp.contactEmail && (
                                <div>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Contact email</p>
                                    <p className="text-sm text-blue-400 mt-0.5">{fullApp.contactEmail}</p>
                                </div>
                            )}
                            {fullApp.url && (
                                <div>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Job posting</p>
                                    <a href={fullApp.url} target="_blank" rel="noopener noreferrer"
                                        className="text-sm text-blue-400 hover:text-blue-300 mt-0.5 block truncate">
                                        {new URL(fullApp.url).hostname}
                                    </a>
                                </div>
                            )}
                            {fullApp.interviewAt && (
                                <div>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Interview date</p>
                                    <p className="text-sm text-white mt-0.5">{formatDate(fullApp.interviewAt)}</p>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {fullApp.notes && (
                            <div>
                                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Notes</p>
                                <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{fullApp.notes}</div>
                            </div>
                        )}

                        {/* Resume */}
                        {fullApp.resumeUrl && (
                            <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                                <div className="w-8 h-8 rounded bg-red-900/50 flex items-center justify-center text-red-300 text-[10px] font-medium">PDF</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-medium truncate">Resume</p>
                                    <p className="text-xs text-gray-500">Uploaded</p>
                                </div>
                            </div>
                        )}

                        {/* Activity Timeline */}
                        {fullApp.activities && fullApp.activities.length > 0 && (
                            <div>
                                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Activity</p>
                                <div className="space-y-2.5">
                                    {fullApp.activities.map((activity, i) => (
                                        <div key={activity.id} className="flex items-start gap-2.5">
                                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? "bg-blue-400" : "bg-gray-600"}`} />
                                            <div>
                                                <p className="text-xs text-white">{activity.action}</p>
                                                <p className="text-[11px] text-gray-500">{formatDate(activity.createdAt)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-2 p-4 border-t border-gray-800">
                        <button onClick={() => setEditing(true)}
                            className="flex-1 py-2 text-sm text-blue-400 border border-blue-900 rounded-lg hover:bg-blue-900/20 transition-colors">
                            Edit
                        </button>
                        <button onClick={handleDelete} disabled={deleting}
                            className="flex-1 py-2 text-sm text-red-400 border border-red-900 rounded-lg hover:bg-red-900/20 disabled:opacity-50 transition-colors">
                            {deleting ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Reminder form modal (renders on top of the detail modal) */}
            {showReminderForm && (
                <ReminderForm
                    applicationId={application.id}
                    onSubmit={handleReminderCreate}
                    onClose={() => setShowReminderForm(false)}
                />
            )}
        </>
    );
}