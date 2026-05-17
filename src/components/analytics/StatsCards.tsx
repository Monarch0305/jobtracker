"use client";

import { AnalyticsData } from "@/hooks/useAnalytics";

const cards: Array<{
  label: string;
  value: (data: AnalyticsData) => string | number;
  hint: string;
}> = [
  {
    label: "Total applications",
    value: (d) => d.totals.total,
    hint: "across all statuses",
  },
  {
    label: "Active pipeline",
    value: (d) => d.totals.active,
    hint: "excluding rejected & wishlist",
  },
  {
    label: "Response rate",
    value: (d) => `${d.totals.responseRate}%`,
    hint: "moved past Applied",
  },
  {
    label: "Offer rate",
    value: (d) => `${d.totals.offerRate}%`,
    hint: "reached Offer or beyond",
  },
];

export default function StatsCards({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-gray-900 border border-gray-800 rounded-xl p-4"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {card.label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {card.value(data)}
          </p>
          <p className="mt-1 text-xs text-gray-600">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}
