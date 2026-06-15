"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/dates";
import type { ItineraryDay } from "@/lib/itinerary/schema";
import type { EventContext } from "@/lib/types";
import { DayCard } from "@/components/itinerary/DayCard";
import { ItalyMap } from "@/components/itinerary/ItalyMap";
import { MiniGlobe } from "@/components/ui/MiniGlobe";
import { useToast } from "@/components/ui/Toast";

interface RegenResponse {
  day?: ItineraryDay;
  engine?: string;
  error?: string;
}

export function ItineraryView({
  tripId,
  initialDays,
  engineModel,
  events,
  cityCoords,
  headline,
}: {
  tripId: string;
  initialDays: ItineraryDay[];
  engineModel: string;
  events: EventContext[];
  cityCoords: Record<string, { lat: number; lng: number }>;
  headline: {
    start: string;
    end: string;
    groupSize: number;
    countryName: string;
    countryCode: string;
  };
}) {
  const router = useRouter();
  const { show, toast } = useToast();
  const [days, setDays] = useState<ItineraryDay[]>(initialDays);
  const [locks, setLocks] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"days" | "map">("days");
  const [showEvents, setShowEvents] = useState(false);
  const [regenDay, setRegenDay] = useState<number | null>(null);

  const total = days.reduce((s, d) => s + (d.daily_total_cost_usd || 0), 0);
  // The SVG route map is Italy-only; other countries use day view until the
  // Phase C Mapbox view lands.
  const showMap = headline.countryCode === "IT";

  const toggleLock = (dayNumber: number) => {
    setLocks((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });
  };

  const regenerate = async (dayNumber: number) => {
    setRegenDay(dayNumber);
    try {
      const res = await fetch(`/api/trips/${tripId}/regenerate-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayNumber,
          lockedDayNumbers: [...locks],
          engine: "live",
        }),
      });
      const data: RegenResponse = await res.json();
      if (!res.ok || !data.day) throw new Error(data.error ?? "Regeneration failed");
      setDays((arr) => arr.map((d) => (d.day_number === dayNumber ? data.day! : d)));
    } catch (err) {
      show(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenDay(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={() => router.push(`/plan`)}
          className="text-sm text-slate-400 hover:text-teal-300"
        >
          ← Edit prefs
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEvents(!showEvents)}
            className="rounded-full border border-amber-500/40 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10"
          >
            ⚡ live_events ({events.length})
          </button>
          <MiniGlobe onClick={() => router.push("/")} />
        </div>
      </div>

      <div className="mb-5">
        <h2 className="wp-display text-3xl text-white">{headline.countryName}, your way</h2>
        <p className="mt-1 text-sm text-slate-400">
          {formatDate(headline.start)} → {formatDate(headline.end)} · {days.length} days ·{" "}
          {headline.groupSize} traveler{headline.groupSize > 1 ? "s" : ""} · est.{" "}
          <span className="font-mono text-amber-300">${Math.round(total).toLocaleString()}</span>
          /person
        </p>
        <p className="mt-1 font-mono text-[11px] text-slate-600">
          engine: {engineModel === "mock" ? "mock generator (preference-weighted)" : `${engineModel} (live API)`}
        </p>
      </div>

      {showEvents && (
        <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
          <p className="mb-2 font-mono text-[10px] text-amber-500/70">
            live_events · partition IT · sources: eventbrite, residentadvisor, tourism-boards
          </p>
          <div className="space-y-1.5">
            {events.map((e) => (
              <div key={e.id} className="flex justify-between gap-3 text-xs">
                <span className="text-amber-100">
                  {e.name} <span className="text-slate-500">· {e.city}</span>
                </span>
                <span className="shrink-0 font-mono text-slate-500">
                  {e.start}
                  {e.end !== e.start ? `→${e.end}` : ""}
                </span>
              </div>
            ))}
            {!events.length && <p className="text-xs text-slate-500">No events during these dates.</p>}
          </div>
        </div>
      )}

      {showMap && (
        <div
          className="mb-5 flex w-fit gap-1 rounded-full border border-slate-800 p-1"
          style={{ background: "rgba(10,15,30,0.8)" }}
        >
          {([
            ["days", "📋 Day view"],
            ["map", "🗺️ Map view"],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
              style={view === v ? { background: "#00E5C3", color: "#06281f" } : { color: "#94a3b8" }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {showMap && view === "map" ? (
        <ItalyMap days={days} cityCoords={cityCoords} />
      ) : (
        <div className="space-y-4 pb-10">
          {days.map((d) => (
            <DayCard
              key={d.day_number}
              day={d}
              locked={locks.has(d.day_number)}
              onLock={() => toggleLock(d.day_number)}
              onRegen={() => regenerate(d.day_number)}
              regenLoading={regenDay === d.day_number}
            />
          ))}
        </div>
      )}
      {toast}
    </div>
  );
}
