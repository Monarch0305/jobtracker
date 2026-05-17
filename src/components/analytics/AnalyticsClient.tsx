"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useAnalytics } from "@/hooks/useAnalytics";
import StatsCards from "@/components/analytics/StatsCards";
import FunnelChart from "@/components/analytics/FunnelChart";
import TimelineChart from "@/components/analytics/TimelineChart";
import StatusBreakdown from "@/components/analytics/StatusBreakdown";
import InsightsPanel from "@/components/analytics/InsightsPanel";

export default function AnalyticsClient({ userName }: { userName: string }) {
  const { data, loading, error } = useAnalytics();

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header — mirrors DashboardClient */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold text-white">JobTracker</h1>
            <nav className="flex gap-1">
              <Link
                href="/dashboard"
                className="text-sm px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                Board
              </Link>
              <span className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 text-white">
                Analytics
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{userName}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 space-y-6 max-w-6xl">
        <div>
          <h2 className="text-lg font-semibold text-white">Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Insights from your application history. Cached 5 minutes.
          </p>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-500">
            Loading analytics...
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20 text-red-400">{error}</div>
        )}

        {!loading && !error && data && data.totals.total === 0 && (
          <div className="text-center py-20 text-gray-500 text-sm">
            No applications yet.{" "}
            <Link
              href="/dashboard"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Add some on the Board
            </Link>{" "}
            to see insights here.
          </div>
        )}

        {!loading && !error && data && data.totals.total > 0 && (
          <>
            <StatsCards data={data} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FunnelChart data={data} />
              <TimelineChart data={data} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StatusBreakdown data={data} />
              <InsightsPanel data={data} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
