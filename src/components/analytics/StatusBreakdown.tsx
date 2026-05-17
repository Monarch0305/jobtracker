"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { AnalyticsData } from "@/hooks/useAnalytics";

const STATUS_COLORS: Record<string, string> = {
  REJECTED: "#ef4444",
  WISHLIST: "#9ca3af",
  APPLIED: "#3b82f6",
  SCREENING: "#eab308",
  INTERVIEW: "#14b8a6",
  OFFER: "#22c55e",
  ACCEPTED: "#a855f7",
};

export default function StatusBreakdown({ data }: { data: AnalyticsData }) {
  const chartData = Object.entries(data.byStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: status.charAt(0) + status.slice(1).toLowerCase(),
      value: count,
      status,
    }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      {/* Title row */}
      <div className="mb-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Status breakdown
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          Current distribution across all applications
        </p>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? "#6b7280"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", color: "#9ca3af" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
