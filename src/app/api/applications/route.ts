import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationSchema } from "@/lib/validations";
import { invalidateUserAnalytics } from "@/lib/redis";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const search = searchParams.get("search");
        const sort = searchParams.get("sort") || "appliedAt";
        const order = searchParams.get("order") || "desc";

        const where: Record<string, unknown> = { userId: session.user.id };

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { company: { contains: search, mode: "insensitive" } },
                { role: { contains: search, mode: "insensitive" } },
            ];
        }

        const applications = await prisma.application.findMany({
            where,
            include: {
                reminders: {
                    where: { sent: false },
                    orderBy: { remindAt: "asc" },
                    take: 1,
                },
            },
            orderBy: { [sort]: order },
        });

        return NextResponse.json(applications);
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch applications" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const validated = applicationSchema.parse(body);

        const application = await prisma.application.create({
            data: {
                ...validated,
                url: validated.url || null,
                interviewAt: validated.interviewAt
                    ? new Date(validated.interviewAt)
                    : null,
                userId: session.user.id,
            },
        });

        await prisma.activity.create({
            data: {
                applicationId: application.id,
                action: "Application created",
            },
        });

        await invalidateUserAnalytics(session.user.id);

        return NextResponse.json(application, { status: 201 });
    } catch (error: unknown) {
        if (error && typeof error === "object" && "issues" in error) {
            return NextResponse.json(
                { error: "Validation failed", details: (error as { issues: unknown }).issues },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Failed to create application" },
            { status: 500 }
        );
    }
}