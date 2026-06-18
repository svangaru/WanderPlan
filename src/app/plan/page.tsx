import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/api/session";
import { Wizard } from "@/components/wizard/Wizard";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: { countries?: string };
}) {
  // One country per trip — take the first selected code.
  const countries = (searchParams.countries ?? "IT")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 1);

  const userId = await getCurrentUserId();
  if (!userId) {
    const callbackUrl = `/plan?countries=${countries.join(",")}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={null}>
      <Wizard initialCountries={countries} />
    </Suspense>
  );
}
