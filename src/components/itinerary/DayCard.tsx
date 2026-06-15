"use client";

import { formatDate } from "@/lib/dates";
import type { ItineraryDay } from "@/lib/itinerary/schema";

function Slot({ label, slot }: { label: string; slot: ItineraryDay["morning"] }) {
  return (
    <div className="flex gap-3 border-t border-slate-800/70 py-2 first:border-0">
      <span className="w-16 shrink-0 pt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-100">
          {slot.activity}{" "}
          <span className="font-normal text-slate-500">
            · ${Math.round(slot.cost_usd)} · {slot.duration_hours}h
          </span>
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{slot.tips}</p>
      </div>
    </div>
  );
}

export function DayCard({
  day,
  locked,
  onLock,
  onRegen,
  regenLoading,
}: {
  day: ItineraryDay;
  locked: boolean;
  onLock: () => void;
  onRegen: () => void;
  regenLoading: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 transition-all"
      style={{
        borderColor: locked ? "rgba(0,229,195,0.5)" : "#1e293b",
        background: "linear-gradient(165deg, rgba(20,32,60,0.6), rgba(10,15,30,0.85))",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="wp-display text-lg text-teal-300">Day {day.day_number}</span>
            <span className="text-xs text-slate-500">{formatDate(day.date)}</span>
            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
              📍 {day.city}
            </span>
            {day.event_highlight && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  background: "rgba(245,166,35,0.15)",
                  color: "#F5A623",
                  border: "1px solid rgba(245,166,35,0.4)",
                }}
              >
                ⚡ LIVE EVENT
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{day.day_theme}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={onLock}
            title={locked ? "Unlock day" : "Lock day"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors"
            style={
              locked
                ? { borderColor: "#00E5C3", color: "#00E5C3" }
                : { borderColor: "#334155", color: "#64748b" }
            }
          >
            {locked ? "🔒" : "🔓"}
          </button>
          <button
            onClick={onRegen}
            disabled={locked || regenLoading}
            title="Regenerate this day"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-sm text-slate-400 transition-colors hover:border-teal-400 hover:text-teal-300 disabled:opacity-30"
          >
            {regenLoading ? <span className="inline-block animate-spin">↻</span> : "↻"}
          </button>
        </div>
      </div>

      {day.transport_from_previous && (
        <div className="mb-2 mt-2 rounded-lg border border-blue-500/25 bg-blue-500/5 px-3 py-2 text-xs text-blue-200/80">
          🚆 {day.transport_from_previous.mode} · {day.transport_from_previous.duration} · $
          {Math.round(day.transport_from_previous.cost_usd)} —{" "}
          {day.transport_from_previous.booking_note}
        </div>
      )}

      <Slot label="Morning" slot={day.morning} />
      <Slot label="Afternoon" slot={day.afternoon} />
      <Slot label="Evening" slot={day.evening} />

      {day.event_highlight && (
        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
          ⚡ <strong>{day.event_highlight.name}</strong>
          {day.event_highlight.source && (
            <span className="font-mono text-amber-500/60"> · scraped:{day.event_highlight.source}</span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-800/70 pt-2.5 text-xs">
        <span className="text-slate-400">
          🏨 {day.accommodation.type} · {day.accommodation.area} · $
          {Math.round(day.accommodation.est_cost_per_night_usd)}/nt
        </span>
        <span className="font-mono text-amber-300">${Math.round(day.daily_total_cost_usd)}/day</span>
      </div>
      {day.local_tip && <p className="mt-2 text-[11px] italic text-slate-500">💡 {day.local_tip}</p>}
    </div>
  );
}
