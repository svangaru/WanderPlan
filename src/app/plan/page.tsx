import { Suspense } from "react";
import { Wizard } from "@/components/wizard/Wizard";

export default function PlanPage({
  searchParams,
}: {
  searchParams: { countries?: string };
}) {
  const countries = (searchParams.countries ?? "IT")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  return (
    <Suspense fallback={null}>
      <Wizard initialCountries={countries} />
    </Suspense>
  );
}
