"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  SLIDER_GROUPS,
  DEFAULT_PREFS,
  GROUP_TYPES,
  DIETARY_OPTIONS,
  countryFlavor,
} from "@/lib/constants";
import { formatDate, daysBetween } from "@/lib/dates";
import type { Preferences, TripInput, GenerationEngine } from "@/lib/types";
import { streamPost } from "@/lib/sse-client";
import {
  loadWizardState,
  saveWizardState,
  setResumeGeneration,
  consumeResumeGeneration,
} from "@/lib/wizard-storage";
import { PrefSlider } from "@/components/wizard/PrefSlider";
import { GeneratingScreen } from "@/components/wizard/GeneratingScreen";
import { MiniGlobe } from "@/components/ui/MiniGlobe";
import { useToast } from "@/components/ui/Toast";

const STEPS = ["Dates & Flights", "Travelers", "Preferences", "Budget", "Review"];
const PARTS_OF_DAY: TripInput["arrivalTime"][] = ["Morning", "Afternoon", "Evening", "Late night"];
const STEP_BLURBS = [
  "when do you arrive, and which airports?",
  "Who's coming?",
  "Slide what matters to you — this drives the AI.",
  "What's the daily damage you're comfortable with?",
  "One last look before we generate.",
];

const FIELD =
  "w-full bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:border-teal-400 focus:outline-none";

type GenEvent =
  | { type: "phase"; message: string; progress: number }
  | { type: "done"; itineraryId: string; engine: GenerationEngine; fallbackReason: string | null }
  | { type: "error"; message: string };

export function Wizard({ initialCountries }: { initialCountries: string[] }) {
  const router = useRouter();
  const { status } = useSession();
  const { show, toast } = useToast();

  const [step, setStep] = useState(0);
  const [tripId, setTripId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genPhase, setGenPhase] = useState("");
  const [engine, setEngine] = useState<GenerationEngine>("live");
  // Gates persistence + resume on client-side rehydration to avoid an SSR
  // hydration mismatch (server has no sessionStorage).
  const [hydrated, setHydrated] = useState(false);
  const [resumePending, setResumePending] = useState(false);

  const [trip, setTrip] = useState<TripInput>({
    startDate: "2026-06-20",
    endDate: "2026-06-27",
    startCity: "Rome",
    endCity: "",
    returnTrip: true,
    groupSize: 2,
    groupType: "Friends",
    dietary: [],
    mobility: false,
    budget: 150,
    countries: initialCountries.length ? initialCountries.slice(0, 1) : ["IT"],
    originAirport: "",
    arrivalAirport: "",
    flightCode: "",
    arrivalTime: "Morning",
    departureTime: "Morning",
  });
  const [prefs, setPrefs] = useState<Preferences>({ ...DEFAULT_PREFS });

  // After mount, rehydrate any saved wizard state and resume intent.
  useEffect(() => {
    const savedState = loadWizardState();
    if (savedState) {
      setTrip(savedState.trip);
      setPrefs(savedState.prefs);
      setStep(savedState.step);
    }
    if (consumeResumeGeneration()) setResumePending(true);
    setHydrated(true);
  }, []);

  // Keep sessionStorage in sync (only after rehydration, so we never clobber it).
  useEffect(() => {
    if (hydrated) saveWizardState({ trip, prefs, step });
  }, [hydrated, trip, prefs, step]);

  const flavor = countryFlavor(trip.countries[0] ?? "IT");
  const totalDays = daysBetween(trip.startDate, trip.endDate);
  const stepValid = [
    totalDays >= 3 &&
      totalDays <= 365 &&
      trip.startCity.trim().length > 0 &&
      trip.originAirport.trim().length > 0 &&
      trip.arrivalAirport.trim().length > 0,
    trip.groupSize >= 1,
    true,
    trip.budget >= 20,
    true,
  ][step];

  /** Persists the draft (POST first time, PATCH after). Returns the trip id. */
  const persistDraft = useCallback(async (): Promise<string | null> => {
    if (status !== "authenticated") return tripId;
    try {
      const url = tripId ? `/api/trips/${tripId}` : "/api/trips";
      const res = await fetch(url, {
        method: tripId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip, prefs }),
      });
      if (!res.ok) return tripId;
      const data = await res.json();
      if (data.tripId && data.tripId !== tripId) setTripId(data.tripId);
      return data.tripId ?? tripId;
    } catch {
      return tripId;
    }
  }, [status, tripId, trip, prefs]);

  const next = async () => {
    await persistDraft();
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const runGeneration = useCallback(async () => {
    const id = await persistDraft();
    if (!id) {
      show("Could not save trip — please retry");
      return;
    }
    setGenerating(true);
    setGenProgress(0.05);
    setGenPhase("Starting…");
    try {
      await streamPost<GenEvent>("/api/generate", { tripId: id, engine: "live" }, (ev) => {
        if (ev.type === "phase") {
          setGenProgress(ev.progress);
          setGenPhase(ev.message);
        } else if (ev.type === "done") {
          setEngine(ev.engine);
          if (ev.fallbackReason) show("Live API unavailable — used mock engine");
          router.push(`/trip/${id}`);
        } else if (ev.type === "error") {
          throw new Error(ev.message);
        }
      });
    } catch (err) {
      setGenerating(false);
      show(err instanceof Error ? err.message : "Generation failed");
    }
  }, [persistDraft, router, show]);

  // Resume generation after a sign-in round-trip, once state is rehydrated and
  // the session is authenticated. runGeneration is in deps, so it re-fires with
  // the rehydrated trip/prefs rather than the defaults.
  useEffect(() => {
    if (hydrated && resumePending && status === "authenticated") {
      setResumePending(false);
      void runGeneration();
    }
  }, [hydrated, resumePending, status, runGeneration]);

  const onGenerate = () => {
    if (status !== "authenticated") {
      // Persist intent + state, then return to this exact wizard after auth.
      setResumeGeneration();
      saveWizardState({ trip, prefs, step });
      const callbackUrl = `/plan?countries=${trip.countries.join(",")}`;
      signIn("google", { callbackUrl });
      return;
    }
    void runGeneration();
  };

  if (generating) {
    return (
      <GeneratingScreen
        progress={genProgress}
        phase={genPhase}
        engine={engine}
        countryName={flavor.name}
        flag={flavor.flag}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/globe")}
          className="text-sm text-slate-400 hover:text-teal-300"
        >
          ← Globe
        </button>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === step ? 28 : 14, background: i <= step ? "#00E5C3" : "#1e293b" }}
            />
          ))}
        </div>
        <MiniGlobe onClick={() => router.push("/globe")} />
      </div>

      <h2 className="wp-display mb-1 text-2xl text-white">{STEPS[step]}</h2>
      <p className="mb-5 text-sm text-slate-500">
        {step === 0 ? `${flavor.name} · ${STEP_BLURBS[0]}` : STEP_BLURBS[step]}
      </p>

      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Start date</label>
              <input
                type="date"
                className={FIELD}
                value={trip.startDate}
                onChange={(e) => setTrip({ ...trip, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">End date</label>
              <input
                type="date"
                className={FIELD}
                value={trip.endDate}
                onChange={(e) => setTrip({ ...trip, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Start city</label>
              <input
                className={FIELD}
                placeholder="e.g. Rome, Milan, Naples"
                value={trip.startCity}
                onChange={(e) => setTrip({ ...trip, startCity: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">End city</label>
              <input
                className={FIELD}
                placeholder="Same as start"
                disabled={trip.returnTrip}
                value={trip.returnTrip ? trip.startCity : trip.endCity}
                onChange={(e) => setTrip({ ...trip, endCity: e.target.value })}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={trip.returnTrip}
              onChange={(e) => setTrip({ ...trip, returnTrip: e.target.checked })}
              className="accent-teal-400"
            />
            Return trip (end where I start)
          </label>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
              <span>✈️</span> Flights
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Departing airport</label>
                <input
                  className={FIELD}
                  placeholder="e.g. JFK"
                  value={trip.originAirport}
                  maxLength={8}
                  onChange={(e) =>
                    setTrip({ ...trip, originAirport: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Arriving airport</label>
                <input
                  className={FIELD}
                  placeholder="e.g. FCO"
                  value={trip.arrivalAirport}
                  maxLength={8}
                  onChange={(e) =>
                    setTrip({ ...trip, arrivalAirport: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Arrive</label>
                <select
                  className={FIELD}
                  value={trip.arrivalTime}
                  onChange={(e) =>
                    setTrip({ ...trip, arrivalTime: e.target.value as TripInput["arrivalTime"] })
                  }
                >
                  {PARTS_OF_DAY.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Depart</label>
                <select
                  className={FIELD}
                  value={trip.departureTime}
                  onChange={(e) =>
                    setTrip({ ...trip, departureTime: e.target.value as TripInput["departureTime"] })
                  }
                >
                  {PARTS_OF_DAY.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Flight code</label>
                <input
                  className={FIELD}
                  placeholder="optional"
                  value={trip.flightCode}
                  maxLength={16}
                  onChange={(e) => setTrip({ ...trip, flightCode: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              A late arrival keeps Day 1 light so you don&apos;t waste it.
            </p>
          </div>

          <div
            className="rounded-lg border px-3 py-2.5 text-sm"
            style={{
              borderColor: "rgba(0,229,195,0.3)",
              background: "rgba(0,229,195,0.06)",
              color: "#7df0dc",
            }}
          >
            {totalDays >= 3
              ? `${totalDays}-day trip · ${formatDate(trip.startDate)} → ${formatDate(trip.endDate)}`
              : "Trips need at least 3 days"}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Travelers: {trip.groupSize}</label>
            <input
              type="range"
              min={1}
              max={12}
              value={trip.groupSize}
              onChange={(e) => setTrip({ ...trip, groupSize: Number(e.target.value) })}
              className="wp-slider w-full"
              style={{ ["--c" as string]: "#00E5C3", ["--p" as string]: `${(trip.groupSize / 12) * 100}%` }}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-slate-400">Group type</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_TYPES.map((g) => (
                <button
                  key={g}
                  onClick={() => setTrip({ ...trip, groupType: g })}
                  className="rounded-lg border px-3.5 py-2 text-sm transition-all"
                  style={
                    trip.groupType === g
                      ? { borderColor: "#00E5C3", color: "#00E5C3", background: "rgba(0,229,195,0.08)" }
                      : { borderColor: "#334155", color: "#94a3b8" }
                  }
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs text-slate-400">Dietary restrictions</label>
            <div className="flex flex-wrap gap-2">
              {[...DIETARY_OPTIONS, "None"].map((d) => {
                const on = d === "None" ? !trip.dietary.length : trip.dietary.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => {
                      if (d === "None") setTrip({ ...trip, dietary: [] });
                      else
                        setTrip({
                          ...trip,
                          dietary: on
                            ? trip.dietary.filter((x) => x !== d)
                            : [...trip.dietary, d],
                        });
                    }}
                    className="rounded-full border px-3 py-1.5 text-xs transition-all"
                    style={
                      on
                        ? { borderColor: "#34D399", color: "#34D399", background: "rgba(52,211,153,0.08)" }
                        : { borderColor: "#334155", color: "#94a3b8" }
                    }
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={trip.mobility}
              onChange={(e) => setTrip({ ...trip, mobility: e.target.checked })}
              className="accent-teal-400"
            />
            Mobility / accessibility needs (we&apos;ll skip strenuous hikes &amp; stair-heavy sites)
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="wp-scroll max-h-[55vh] space-y-5 overflow-y-auto pr-2">
          {SLIDER_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                <h3 className="text-xs uppercase tracking-widest text-slate-400">{g.label}</h3>
              </div>
              {g.sliders.map((s) => (
                <PrefSlider
                  key={s.key}
                  def={s}
                  color={g.color}
                  value={prefs[s.key]}
                  onChange={(v) => setPrefs({ ...prefs, [s.key]: v })}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Daily budget per person (USD):{" "}
              <span className="font-mono text-amber-400">${trip.budget}</span>
            </label>
            <input
              type="range"
              min={30}
              max={600}
              step={10}
              value={trip.budget}
              onChange={(e) => setTrip({ ...trip, budget: Number(e.target.value) })}
              className="wp-slider w-full"
              style={{ ["--c" as string]: "#F5A623", ["--p" as string]: `${((trip.budget - 30) / 570) * 100}%` }}
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
              <span>$30 hostel life</span>
              <span>$600 la dolce vita</span>
            </div>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-200/80">
            Estimated trip total:{" "}
            <strong>${(trip.budget * totalDays * trip.groupSize).toLocaleString()}</strong> (
            {trip.groupSize} traveler{trip.groupSize > 1 ? "s" : ""} × {totalDays} days)
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm">
            <Row k="Country" v={`${flavor.flag} ${flavor.name}`} />
            <Row
              k="Dates"
              v={`${formatDate(trip.startDate)} → ${formatDate(trip.endDate)} (${totalDays} days)`}
            />
            <Row
              k="Route"
              v={`${trip.startCity || "Rome"} → ${trip.returnTrip ? trip.startCity || "Rome" : trip.endCity || "open"}`}
            />
            <Row
              k="Group"
              v={`${trip.groupSize} · ${trip.groupType}${trip.dietary.length ? " · " + trip.dietary.join(", ") : ""}`}
            />
            <Row
              k="Flights"
              v={`${trip.originAirport || "—"} → ${trip.arrivalAirport || "—"} · arrive ${trip.arrivalTime.toLowerCase()}${trip.flightCode ? ` · ${trip.flightCode}` : ""}`}
            />
            <Row k="Budget" v={`$${trip.budget}/day/person`} />
            <Row k="Top priorities" v={topPriorities(prefs)} />
          </div>
          {status !== "authenticated" && (
            <div className="rounded-lg border border-slate-700 px-3 py-2.5 text-xs text-slate-400">
              🔒 Sign in with Google to generate and save this trip.
            </div>
          )}
        </div>
      )}

      <div className="mt-7 flex justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="rounded-full border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-30"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            disabled={!stepValid}
            className="rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-30"
            style={{ background: "#00E5C3", color: "#06281f" }}
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={onGenerate}
            className="rounded-full px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-105"
            style={{ background: "#00E5C3", color: "#06281f", boxShadow: "0 0 30px rgba(0,229,195,0.3)" }}
          >
            {status === "authenticated" ? "✨ Generate My Itinerary" : "Sign in & Generate"}
          </button>
        )}
      </div>
      {toast}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-slate-500">{k}</span>
      <span className="text-right text-slate-200">{v}</span>
    </div>
  );
}

function topPriorities(prefs: Preferences): string {
  const experienceKeys = SLIDER_GROUPS[0].sliders.map((s) => s.key);
  return experienceKeys
    .map((k) => ({ k, v: prefs[k] }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map(({ k }) => SLIDER_GROUPS[0].sliders.find((s) => s.key === k)?.label ?? k)
    .join(" · ");
}
