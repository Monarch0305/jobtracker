import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationSchema } from "@/lib/validations";
import { invalidateUserAnalytics } from "@/lib/redis";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const application = await prisma.application.findFirst({
            where: { id, userId: session.user.id },
            include: {
                reminders: { orderBy: { remindAt: "desc" } },
                activities: { orderBy: { createdAt: "desc" } },
            },
        });

        if (!application) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(application);
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch application" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const existing = await prisma.application.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const body = await request.json();
        const validated = applicationSchema.partial().parse(body);

        const application = await prisma.application.update({
            where: { id },
            data: {
                ...validated,
                url: validated.url !== undefined ? validated.url || null : undefined,
                interviewAt:
                    validated.interviewAt !== undefined
                        ? validated.interviewAt
                            ? new Date(validated.interviewAt)
                            : null
                        : undefined,
            },
        });

        if (validated.status && validated.status !== existing.status) {
            await prisma.activity.create({
                data: {
                    applicationId: id,
                    action: `Moved to ${validated.status.charAt(0) + validated.status.slice(1).toLowerCase()}`,
                },
            });
        }

        await invalidateUserAnalytics(session.user.id);

        return NextResponse.json(application);
    } catch (error: unknown) {
        if (error && typeof error === "object" && "issues" in error) {
            return NextResponse.json(
                { error: "Validation failed", details: (error as { issues: unknown }).issues },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Failed to update application" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const existing = await prisma.application.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await prisma.application.delete({ where: { id } });

        await invalidateUserAnalytics(session.user.id);

        return NextResponse.json({ message: "Deleted" });
    } catch {
        return NextResponse.json(
            { error: "Failed to delete application" },
            { status: 500 }
        );
    }
}