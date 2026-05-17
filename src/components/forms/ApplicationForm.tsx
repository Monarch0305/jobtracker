"use client";

import { useState } from "react";
import { Application, ApplicationStatus, Priority } from "@/types";

interface ApplicationFormProps {
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    onClose: () => void;
    initialData?: Application;
    mode?: "create" | "edit";
}

export default function ApplicationForm({
    onSubmit,
    onClose,
    initialData,
    mode = "create",
}: ApplicationFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [company, setCompany] = useState(initialData?.company ?? "");
    const [role, setRole] = useState(initialData?.role ?? "");
    const [url, setUrl] = useState(initialData?.url ?? "");
    const [salaryMin, setSalaryMin] = useState(
        initialData?.salaryMin != null ? String(initialData.salaryMin) : ""
    );
    const [salaryMax, setSalaryMax] = useState(
        initialData?.salaryMax != null ? String(initialData.salaryMax) : ""
    );
    const [status, setStatus] = useState<ApplicationStatus>(
        initialData?.status ?? "APPLIED"
    );
    const [priority, setPriority] = useState<Priority>(
        initialData?.priority ?? "MEDIUM"
    );
    const [contactName, setContactName] = useState(initialData?.contactName ?? "");
    const [contactEmail, setContactEmail] = useState(initialData?.contactEmail ?? "");
    const [notes, setNotes] = useState(initialData?.notes ?? "");
    const [interviewAt, setInterviewAt] = useState(
        initialData?.interviewAt
            ? new Date(initialData.interviewAt).toISOString().slice(0, 16)
            : ""
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await onSubmit({
                company, role,
                url: url || undefined,
                salaryMin: salaryMin ? parseInt(salaryMin) : null,
                salaryMax: salaryMax ? parseInt(salaryMax) : null,
                status, priority,
                contactName: contactName || null,
                contactEmail: contactEmail || null,
                notes: notes || null,
                interviewAt: interviewAt ? new Date(interviewAt).toISOString() : null,
            });
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : `Failed to ${mode === "edit" ? "update" : "create"} application`);
        } finally {
            setLoading(false);
        }
    };

    const isEdit = mode === "edit";

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-800">
                    <h2 className="text-lg font-medium text-white">{isEdit ? "Edit application" : "Add application"}</h2>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Company *</label>
                            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Google" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Role *</label>
                            <input type="text" value={role} onChange={(e) => setRole(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="SDE 2" required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Job URL</label>
                        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="https://careers.google.com/..." />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Salary min (LPA)</label>
                            <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="18" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Salary max (LPA)</label>
                            <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="28" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Status</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                                <option value="WISHLIST">Wishlist</option>
                                <option value="APPLIED">Applied</option>
                                <option value="SCREENING">Screening</option>
                                <option value="INTERVIEW">Interview</option>
                                <option value="OFFER">Offer</option>
                                <option value="ACCEPTED">Accepted</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Priority</label>
                            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Contact name</label>
                            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Priya Sharma" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Contact email</label>
                            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="priya@company.com" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Interview date</label>
                        <input type="datetime-local" value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Notes</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none" placeholder="Any notes about the application..." />
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors">
                            {loading ? (isEdit ? "Saving..." : "Adding...") : (isEdit ? "Save changes" : "Add application")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}