import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AnalyticsClient from "@/components/analytics/AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <AnalyticsClient userName={session.user.name || "User"} />;
}
