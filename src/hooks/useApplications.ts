"use client";

import { useState, useEffect, useCallback } from "react";
import { Application, ApplicationStatus } from "@/types";

interface UseApplicationsOptions {
    search?: string;
    status?: ApplicationStatus | "ALL";
}

export function useApplications(options: UseApplicationsOptions = {}) {
    const { search = "", status = "ALL" } = options;

    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Debounce search to avoid hammering the API on every keystroke
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const fetchApplications = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (status && status !== "ALL") params.set("status", status);

            const qs = params.toString();
            const res = await fetch(`/api/applications${qs ? `?${qs}` : ""}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setApplications(data);
            setError("");
        } catch {
            setError("Failed to load applications");
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, status]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const createApplication = async (data: Partial<Application>) => {
        const res = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to create");
        }
        await fetchApplications();
        return res.json();
    };

    // Optimistic update — flip local state instantly, sync to server in background
    const updateApplication = async (id: string, data: Partial<Application>) => {
        const previous = applications;
        setApplications((prev) =>
            prev.map((app) => (app.id === id ? { ...app, ...data } : app))
        );

        try {
            const res = await fetch(`/api/applications/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update");
            }
            const updated = await res.json();
            // Quietly reconcile with server response (in case server normalized data)
            setApplications((prev) =>
                prev.map((app) => (app.id === id ? { ...app, ...updated } : app))
            );
            return updated;
        } catch (err) {
            // Roll back on failure
            setApplications(previous);
            throw err;
        }
    };

    const deleteApplication = async (id: string) => {
        const previous = applications;
        setApplications((prev) => prev.filter((app) => app.id !== id));

        try {
            const res = await fetch(`/api/applications/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to delete");
            }
        } catch (err) {
            setApplications(previous);
            throw err;
        }
    };

    return {
        applications,
        loading,
        error,
        createApplication,
        updateApplication,
        deleteApplication,
        refetch: fetchApplications,
    };
}