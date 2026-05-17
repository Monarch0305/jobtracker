"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { AnalyticsData } from "@/hooks/useAnalytics";

const STAGE_COLORS: Record<string, string> = {
  Applied: "#3b82f6",
  Screening: "#eab308",
  Interview: "#14b8a6",
  Offer: "#22c55e",
  Accepted: "#a855f7",
};

export default function FunnelChart({ data }: { data: AnalyticsData }) {
  // Precompute the label string so Recharts can use it as a plain dataKey
  const chartData = data.funnel.map((d) => ({
    ...d,
    label: `${d.count} (${d.percent}%)`,
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      {/* Title row */}
      <div className="mb-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Conversion funnel
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          How applications progress through stages
        </p>
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 80, bottom: 0, left: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="stage"
              type="category"
              stroke="#6b7280"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              width={90}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.stage}
                  fill={STAGE_COLORS[entry.stage] ?? "#6b7280"}
                />
              ))}
              <LabelList
                dataKey="label"
                position="right"
                fill="#ffffff"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}