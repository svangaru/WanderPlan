"use client";

/**
 * Persistent glowing mini-globe badge (SPEC §Signature Element). Appears on
 * planning/itinerary views so users stay geo-anchored to their trip.
 */
export function MiniGlobe({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Back to globe"
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 transition-colors hover:border-teal-400"
      style={{ background: "radial-gradient(circle at 35% 35%, #16294a, #0a0f1e)" }}
    >
      <span
        className="absolute h-2 w-2 animate-pulse rounded-full"
        style={{ background: "#00E5C3", top: "30%", left: "52%" }}
      />
      <span className="absolute -bottom-4 text-[9px] text-slate-500">IT</span>
    </button>
  );
}
