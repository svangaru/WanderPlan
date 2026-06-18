"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

const FEATURES = [
  {
    icon: "🌍",
    title: "Pick on a 3D globe",
    body: "Spin an interactive globe and choose your destination. Italy and 9 more of the world's most-visited countries are live.",
  },
  {
    icon: "🎚️",
    title: "Tune 16 preferences",
    body: "Slide what you care about — food, hikes, nightlife, budget, pace, hidden gems — and we weight the whole trip around it.",
  },
  {
    icon: "✨",
    title: "AI day-by-day plan",
    body: "Get a structured itinerary grounded in a real database of experiences and live events — not generic hallucinated fluff.",
  },
  {
    icon: "🔁",
    title: "Lock & regenerate",
    body: "Love a day? Lock it. Regenerate the rest. Every plan is saved to your account to revisit and refine.",
  },
];

export function Landing() {
  const { status, data } = useSession();
  const router = useRouter();
  const authed = status === "authenticated";

  const enter = () => {
    if (authed) router.push("/globe");
    else signIn("google", { callbackUrl: "/globe" });
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="wp-display text-2xl text-white">
          Wander<span style={{ color: "#00E5C3" }}>Plan</span>
        </span>
        <div className="flex items-center gap-3">
          {authed ? (
            <>
              <span className="hidden text-sm text-slate-400 sm:inline">{data?.user?.name}</span>
              <button
                onClick={() => router.push("/globe")}
                className="rounded-full px-5 py-2 text-sm font-semibold transition-transform hover:scale-105"
                style={{ background: "#00E5C3", color: "#06281f" }}
              >
                Enter app →
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/globe" })}
              disabled={status === "loading"}
              className="rounded-full border border-slate-600 px-5 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-teal-400 hover:text-teal-300 disabled:opacity-40"
            >
              Log in
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="flex flex-col items-center pt-16 text-center md:pt-24">
          <span
            className="mb-5 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "rgba(0,229,195,0.4)", color: "#7df0dc", background: "rgba(0,229,195,0.06)" }}
          >
            AI travel planning · 10 countries live
          </span>
          <h1 className="wp-display max-w-3xl text-4xl leading-tight text-white md:text-6xl">
            Plan trips you&apos;ll <span style={{ color: "#00E5C3" }}>actually love.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-400 md:text-lg">
            Pick a country on a glowing 3D globe, set your travel style with sliders, and get a
            personalized day-by-day itinerary built from real experiences and live local events.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <button
              onClick={enter}
              disabled={status === "loading"}
              className="rounded-full px-8 py-3 text-base font-semibold transition-all hover:scale-105 disabled:opacity-40"
              style={{ background: "#00E5C3", color: "#06281f", boxShadow: "0 0 40px rgba(0,229,195,0.35)" }}
            >
              {authed ? "Plan a trip →" : "Get started — it's free"}
            </button>
            {!authed && (
              <span className="text-xs text-slate-500">Sign in with Google · no credit card</span>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 py-20 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-800 p-5"
              style={{ background: "linear-gradient(165deg, rgba(20,32,60,0.5), rgba(10,15,30,0.7))" }}
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="wp-display mb-1.5 text-lg text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-xs text-slate-600">
        WanderPlan · built with Next.js, Prisma, and Claude
      </footer>
    </div>
  );
}
