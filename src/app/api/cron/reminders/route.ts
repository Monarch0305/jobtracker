import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderDigest, DueReminder } from "@/lib/email";

/**
 * Daily cron: GET /api/cron/reminders
 * Vercel hits this once per day. Auth via CRON_SECRET bearer token.
 *
 * Logic:
 *   1. Find all reminders where sent=false AND remindAt <= now
 *   2. Group by user (via application.userId)
 *   3. Send one digest email per user
 *   4. Mark all sent reminders as sent=true
 *
 * Errors per-user are logged but don't abort the whole batch.
 */
export async function GET(request: NextRequest) {
    // Auth check — Vercel sends `Authorization: Bearer <CRON_SECRET>`
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Pull all due, unsent reminders along with their owning user
    const dueReminders = await prisma.reminder.findMany({
        where: {
            sent: false,
            remindAt: { lte: now },
        },
        include: {
            application: {
                select: {
                    id: true,
                    company: true,
                    role: true,
                    user: {
                        select: { id: true, email: true, name: true },
                    },
                },
            },
        },
        orderBy: { remindAt: "asc" },
    });

    if (dueReminders.length === 0) {
        return NextResponse.json({ ok: true, processed: 0, users: 0 });
    }

    // Group by user
    type Bucket = {
        email: string;
        name: string | null;
        reminders: DueReminder[];
    };
    const byUser = new Map<string, Bucket>();

    for (const r of dueReminders) {
        const user = r.application.user;
        if (!user?.email) continue;
        const existing = byUser.get(user.id);
        const item: DueReminder = {
            id: r.id,
            message: r.message,
            remindAt: r.remindAt,
            application: {
                id: r.application.id,
                company: r.application.company,
                role: r.application.role,
            },
        };
        if (existing) {
            existing.reminders.push(item);
        } else {
            byUser.set(user.id, {
                email: user.email,
                name: user.name,
                reminders: [item],
            });
        }
    }

    let usersSent = 0;
    let remindersSent = 0;
    const failures: Array<{ userId: string; error: string }> = [];

    for (const [userId, bucket] of Array.from(byUser.entries())) {
        try {
            await sendReminderDigest(bucket.email, bucket.name, bucket.reminders);
            // Only mark as sent if the email actually went out
            await prisma.reminder.updateMany({
                where: { id: { in: bucket.reminders.map((r) => r.id) } },
                data: { sent: true },
            });
            usersSent++;
            remindersSent += bucket.reminders.length;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            failures.push({ userId, error: msg });
            console.error(`[cron] Failed for user ${userId}:`, msg);
        }
    }

    return NextResponse.json({
        ok: true,
        processed: remindersSent,
        users: usersSent,
        failures,
    });
}