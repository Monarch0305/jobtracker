"use client";

import { useState } from "react";

interface ReminderFormProps {
    applicationId: string;
    onSubmit: (data: { applicationId: string; remindAt: string; message: string }) => Promise<void>;
    onClose: () => void;
}

export default function ReminderForm({ applicationId, onSubmit, onClose }: ReminderFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    // Default to 3 days from now at 9 AM local time — sensible default for a follow-up reminder
    const defaultDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        d.setHours(9, 0, 0, 0);
        return d.toISOString().slice(0, 16);
    })();
    const [remindAt, setRemindAt] = useState(defaultDate);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await onSubmit({
                applicationId,
                remindAt: new Date(remindAt).toISOString(),
                message: message.trim(),
            });
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create reminder");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-800">
                    <h2 className="text-lg font-medium text-white">Add reminder</h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Message *</label>
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Follow up with recruiter"
                            required
                            maxLength={200}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Remind me on *</label>
                        <input
                            type="datetime-local"
                            value={remindAt}
                            onChange={(e) => setRemindAt(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                            You&apos;ll get an email when this comes due.
                        </p>
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            {loading ? "Adding..." : "Add reminder"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}