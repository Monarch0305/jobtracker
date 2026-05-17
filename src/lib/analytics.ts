import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@/types";

export interface AnalyticsResult {
  totals: {
    total: number;
    active: number;
    interviews: number;
    offers: number;
    responseRate: number; // integer percent
    offerRate: number;    // integer percent
  };
  byStatus: Record<ApplicationStatus, number>;
  funnel: Array<{ stage: string; count: number; percent: number }>;
  timeline: Array<{ weekStart: string; count: number }>; // last 12 weeks
  daily: Array<{ date: string; count: number }>;          // last 30 days
  timeToResponse: {
    appliedToScreeningDays: number | null;
    screeningToInterviewDays: number | null;
    interviewToOfferDays: number | null;
    applicationsConsidered: number;
  };
}

// Status rank — used for funnel and response-rate calculations
const STATUS_RANK: Record<ApplicationStatus, number> = {
  WISHLIST: -2,
  REJECTED: -1,
  APPLIED: 0,
  SCREENING: 1,
  INTERVIEW: 2,
  OFFER: 3,
  ACCEPTED: 4,
};

const ALL_STATUSES: ApplicationStatus[] = [
  "REJECTED",
  "WISHLIST",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "ACCEPTED",
];

// Most-recent Sunday at 00:00 local (used to build weekly buckets)
function mostRecentSunday(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // go back to Sunday
  return d;
}

// Format Date → "YYYY-MM-DD"
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function computeAnalytics(userId: string): Promise<AnalyticsResult> {
  // Single query — fetch all apps with their activities
  const apps = await prisma.application.findMany({
    where: { userId },
    select: {
      id: true,
      status: true,
      appliedAt: true,
      activities: {
        select: { action: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // ── byStatus ──────────────────────────────────────────────────────────────
  const byStatus = Object.fromEntries(
    ALL_STATUSES.map((s) => [s, 0])
  ) as Record<ApplicationStatus, number>;

  for (const app of apps) {
    byStatus[app.status as ApplicationStatus]++;
  }

  // ── totals ────────────────────────────────────────────────────────────────
  const total = apps.length;
  const active = apps.filter(
    (a) => !["REJECTED", "ACCEPTED", "WISHLIST"].includes(a.status)
  ).length;
  const interviews = byStatus["INTERVIEW"];
  const offers = byStatus["OFFER"] + byStatus["ACCEPTED"];

  // responseRate = % of applied-or-beyond that moved past APPLIED
  const appliedOrBeyond = apps.filter(
    (a) => STATUS_RANK[a.status as ApplicationStatus] >= 0
  ).length;
  const movedPastApplied = apps.filter(
    (a) => STATUS_RANK[a.status as ApplicationStatus] >= 1
  ).length;
  const responseRate =
    appliedOrBeyond > 0
      ? Math.round((movedPastApplied / appliedOrBeyond) * 100)
      : 0;

  const reachedOffer = apps.filter(
    (a) => STATUS_RANK[a.status as ApplicationStatus] >= 3
  ).length;
  const offerRate =
    appliedOrBeyond > 0
      ? Math.round((reachedOffer / appliedOrBeyond) * 100)
      : 0;

  // ── funnel ────────────────────────────────────────────────────────────────
  const funnelStages: ApplicationStatus[] = [
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "ACCEPTED",
  ];
  const appliedBase = apps.filter(
    (a) => STATUS_RANK[a.status as ApplicationStatus] >= 0
  ).length;

  const funnel = funnelStages.map((stage) => {
    const count = apps.filter(
      (a) => STATUS_RANK[a.status as ApplicationStatus] >= STATUS_RANK[stage]
    ).length;
    const percent =
      appliedBase > 0 ? Math.round((count / appliedBase) * 100) : 0;
    return {
      stage: stage.charAt(0) + stage.slice(1).toLowerCase(),
      count,
      percent,
    };
  });

  // ── timeline (12 weekly buckets) ──────────────────────────────────────────
  const sunday = mostRecentSunday(new Date());
  const weekBuckets: { weekStart: string; count: number }[] = [];

  for (let w = 11; w >= 0; w--) {
    const start = new Date(sunday);
    start.setDate(sunday.getDate() - w * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const count = apps.filter((a) => {
      const d = new Date(a.appliedAt);
      return d >= start && d < end;
    }).length;
    weekBuckets.push({ weekStart: toDateStr(start), count });
  }

  // ── daily (30 buckets) ────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const dailyBuckets: { date: string; count: number }[] = [];

  for (let d = 29; d >= 0; d--) {
    const day = new Date();
    day.setDate(new Date().getDate() - d);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const count = apps.filter((a) => {
      const applied = new Date(a.appliedAt);
      return applied >= day && applied <= dayEnd;
    }).length;
    dailyBuckets.push({ date: toDateStr(day), count });
  }

  // ── timeToResponse ────────────────────────────────────────────────────────
  const transitionKeywords = {
    screening: ["screening"],
    interview: ["interview"],
    offer: ["offer"],
  } as const;

  type TransKey = keyof typeof transitionKeywords;

  // For each app with activities, find the timestamp of the first activity
  // whose action string matches each transition keyword.
  const appliedToScreeningDeltas: number[] = [];
  const screeningToInterviewDeltas: number[] = [];
  const interviewToOfferDeltas: number[] = [];

  for (const app of apps) {
    const firstTs = (key: TransKey): Date | null => {
      const keywords = transitionKeywords[key];
      const act = app.activities.find((a) =>
        keywords.some((kw) => a.action.toLowerCase().includes(kw))
      );
      return act ? new Date(act.createdAt) : null;
    };

    const appliedTs = new Date(app.appliedAt);
    const screeningTs = firstTs("screening");
    const interviewTs = firstTs("interview");
    const offerTs = firstTs("offer");

    if (screeningTs) {
      appliedToScreeningDeltas.push(
        (screeningTs.getTime() - appliedTs.getTime()) / 86_400_000
      );
    }
    if (screeningTs && interviewTs) {
      screeningToInterviewDeltas.push(
        (interviewTs.getTime() - screeningTs.getTime()) / 86_400_000
      );
    }
    if (interviewTs && offerTs) {
      interviewToOfferDeltas.push(
        (offerTs.getTime() - interviewTs.getTime()) / 86_400_000
      );
    }
  }

  const avg = (arr: number[]): number | null =>
    arr.length === 0
      ? null
      : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;

  const applicationsConsidered = apps.filter(
    (a) => STATUS_RANK[a.status as ApplicationStatus] >= 1
  ).length;

  return {
    totals: { total, active, interviews, offers, responseRate, offerRate },
    byStatus,
    funnel,
    timeline: weekBuckets,
    daily: dailyBuckets,
    timeToResponse: {
      appliedToScreeningDays: avg(appliedToScreeningDeltas),
      screeningToInterviewDays: avg(screeningToInterviewDeltas),
      interviewToOfferDays: avg(interviewToOfferDeltas),
      applicationsConsidered,
    },
  };
}
