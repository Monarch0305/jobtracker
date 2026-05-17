"use client";

import { useState, useEffect } from "react";

export interface AnalyticsData {
  totals: {
    total: number;
    active: number;
    interviews: number;
    offers: number;
    responseRate: number;
    offerRate: number;
  };
  byStatus: Record<string, number>;
  funnel: Array<{ stage: string; count: number; percent: number }>;
  timeline: Array<{ weekStart: string; count: number }>;
  daily: Array<{ date: string; count: number }>;
  timeToResponse: {
    appliedToScreeningDays: number | null;
    screeningToInterviewDays: number | null;
    interviewToOfferDays: number | null;
    applicationsConsidered: number;
  };
}

export function useAnalytics(): {
  data: AnalyticsData | null;
  loading: boolean;
  error: string;
} {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed with status ${res.status}`);
        }
        const json: AnalyticsData = await res.json();
        if (!cancelled) {
          setData(json);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
