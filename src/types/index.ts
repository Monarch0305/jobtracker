import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
        };
    }
}

export type ApplicationStatus =
    | "REJECTED"
    | "WISHLIST"
    | "APPLIED"
    | "SCREENING"
    | "INTERVIEW"
    | "OFFER"
    | "ACCEPTED";

export type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface Application {
    id: string;
    company: string;
    role: string;
    url: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    status: ApplicationStatus;
    priority: Priority;
    notes: string | null;
    resumeUrl: string | null;
    contactName: string | null;
    contactEmail: string | null;
    appliedAt: string;
    interviewAt: string | null;
    createdAt: string;
    updatedAt: string;
    activities?: Activity[];
    reminders?: Reminder[];
}

export interface Activity {
    id: string;
    action: string;
    createdAt: string;
}

export interface Reminder {
    id: string;
    remindAt: string;
    message: string;
    sent: boolean;
    createdAt: string;
}

export interface AnalyticsData {
    totalApplied: number;
    responseRate: number;
    interviews: number;
    offers: number;
    statusCounts: Record<ApplicationStatus, number>;
    weeklyApplications: { week: string; count: number }[];
    funnel: { stage: string; count: number; percentage: number }[];
}