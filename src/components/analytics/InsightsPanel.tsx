"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AnalyticsData } from "@/hooks/useAnalytics";

const TIME_METRICS = [
  {
    label: "Applied → Screening",
    key: "appliedToScreeningDays" as const,
    hint: "days to first response",
  },
  {
    label: "Screening → Interview",
    key: "screeningToInterviewDays" as const,
    hint: "days to interview stage",
  },
  {
    label: "Interview → Offer",
    key: "interviewToOfferDays" as const,
    hint: "days to receive offer",
  },
];

export default function InsightsPanel({ data }: { data: AnalyticsData }) {
  const dailyData = data.daily.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
      {/* Title row */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Activity & response times
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          Submission cadence and pipeline velocity
        </p>
      </div>

      {/* Section 1 — Time-to-response */}
      <div>
        <div className="grid grid-cols-3 gap-3">
          {TIME_METRICS.map((metric) => {
            const value = data.timeToResponse[metric.key];
            return (
              <div
                key={metric.key}
                className="bg-gray-800/50 rounded-lg p-3"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  {metric.label}
                </p>
                <p className="text-2xl font-semibold text-white mt-1">
                  {value === null ? "—" : `${value}d`}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {metric.hint}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-600 mt-2">
          Based on {data.timeToResponse.applicationsConsidered} application
          {data.timeToResponse.applicationsConsidered !== 1 ? "s" : ""} past
          Applied stage
        </p>
      </div>

      {/* Section 2 — Daily submission chart */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">
          Last 30 days
        </p>
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyData}
              margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
            >
              <XAxis
                dataKey="label"
                interval={6}
                stroke="#6b7280"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#fff" }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
