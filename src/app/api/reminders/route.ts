import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reminderSchema } from "@/lib/validations";

// GET /api/reminders — returns user's unsent reminders, ordered by remindAt asc
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const reminders = await prisma.reminder.findMany({
            where: {
                sent: false,
                application: { userId: session.user.id },
            },
            include: {
                application: {
                    select: { id: true, company: true, role: true, status: true },
                },
            },
            orderBy: { remindAt: "asc" },
        });

        return NextResponse.json(reminders);
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch reminders" },
            { status: 500 }
        );
    }
}

// POST /api/reminders — create a reminder for one of user's applications
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const validated = reminderSchema.parse(body);

        // Confirm the application belongs to the user before attaching a reminder
        const app = await prisma.application.findFirst({
            where: { id: validated.applicationId, userId: session.user.id },
            select: { id: true },
        });
        if (!app) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        const reminder = await prisma.reminder.create({
            data: {
                applicationId: validated.applicationId,
                remindAt: new Date(validated.remindAt),
                message: validated.message,
            },
        });

        return NextResponse.json(reminder, { status: 201 });
    } catch (error: unknown) {
        if (error && typeof error === "object" && "issues" in error) {
            return NextResponse.json(
                { error: "Validation failed", details: (error as { issues: unknown }).issues },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Failed to create reminder" },
            { status: 500 }
        );
    }
}