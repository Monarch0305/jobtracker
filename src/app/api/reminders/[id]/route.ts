import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper: ensure the reminder belongs to the current user (via application)
async function getOwnedReminder(reminderId: string, userId: string) {
    return prisma.reminder.findFirst({
        where: {
            id: reminderId,
            application: { userId },
        },
    });
}

// PATCH /api/reminders/[id] — mark as done (sent: true) or update message/time
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const owned = await getOwnedReminder(id, session.user.id);
        if (!owned) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const body = await request.json();
        const data: { sent?: boolean; message?: string; remindAt?: Date } = {};
        if (typeof body.sent === "boolean") data.sent = body.sent;
        if (typeof body.message === "string" && body.message.length > 0)
            data.message = body.message;
        if (typeof body.remindAt === "string")
            data.remindAt = new Date(body.remindAt);

        const updated = await prisma.reminder.update({
            where: { id },
            data,
        });

        return NextResponse.json(updated);
    } catch {
        return NextResponse.json(
            { error: "Failed to update reminder" },
            { status: 500 }
        );
    }
}

// DELETE /api/reminders/[id]
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const owned = await getOwnedReminder(id, session.user.id);
        if (!owned) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await prisma.reminder.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Failed to delete reminder" },
            { status: 500 }
        );
    }
}