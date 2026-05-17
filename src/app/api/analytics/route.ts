import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cached } from "@/lib/redis";
import { computeAnalytics } from "@/lib/analytics";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const result = await cached(
      `analytics:${userId}`,
      300, // 5-minute TTL
      () => computeAnalytics(userId)
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/analytics] error:", err);
    return NextResponse.json(
      { error: "Failed to compute analytics" },
      { status: 500 }
    );
  }
}
