import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/api/session";
import { GlobeLanding } from "@/components/globe/GlobeLanding";

export const dynamic = "force-dynamic";

export default async function GlobePage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/");
  return <GlobeLanding />;
}
