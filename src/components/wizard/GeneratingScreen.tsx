"use client";

import type { GenerationEngine } from "@/lib/types";

/** Full-screen generation progress (ported from prototype's GeneratingScreen). */
export function GeneratingScreen({
  progress,
  phase,
  engine,
  countryName,
  flag,
}: {
  progress: number;
  phase: string;
  engine: GenerationEngine;
  countryName: string;
  flag: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-7 h-24 w-24">
        <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <div
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: "#00E5C3", animationDuration: "1.1s" }}
        />
        <div
          className="absolute inset-3 rounded-full"
          style={{ background: "radial-gradient(circle at 35% 35%, #16294a, #0a0f1e)" }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xl">{flag}</span>
      </div>
      <h3 className="wp-display mb-2 text-2xl text-white">Building your {countryName}</h3>
      <p className="h-5 text-sm text-slate-400 transition-all">{phase}</p>
      <div className="mt-6 h-1.5 w-64 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.round(progress * 100)}%`,
            background: "linear-gradient(90deg,#00E5C3,#34D399)",
          }}
        />
      </div>
      <p className="mt-2 font-mono text-[11px] text-slate-600">
        engine: {engine === "live" ? "claude (live)" : "mock fallback"}
      </p>
    </div>
  );
}
