"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { GLOBE_COUNTRIES } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { LaunchTransition } from "@/components/globe/LaunchTransition";

// react-globe.gl touches `window`, so it must load client-only.
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type GlobeCountry = (typeof GLOBE_COUNTRIES)[number];

const navyGlobeMaterial = new THREE.MeshPhongMaterial({
  color: 0x0d1a33,
  emissive: 0x060d1c,
  shininess: 8,
});

export function GlobeLanding() {
  const router = useRouter();
  const { show, toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [selected, setSelected] = useState<string[]>([]);
  const [launching, setLaunching] = useState(false);
  const [landPolygons, setLandPolygons] = useState<object[]>([]);

  // Load country borders for the globe surface (bundled, fetched once).
  useEffect(() => {
    let cancelled = false;
    fetch("/data/countries-110m.geojson")
      .then((r) => r.json())
      .then((geo: { features?: object[] }) => {
        if (!cancelled) setLandPolygons(geo.features ?? []);
      })
      .catch(() => {
        /* globe still renders with markers if borders fail to load */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = useMemo(() => GLOBE_COUNTRIES.map((c) => ({ ...c })), []);
  const rings = useMemo(
    () => GLOBE_COUNTRIES.filter((c) => c.active).map((c) => ({ lat: c.lat, lng: c.lng })),
    [],
  );

  // One country per trip — selecting a new country replaces the current pick.
  const toggle = (code: string) => {
    setSelected((s) => (s.includes(code) ? [] : [code]));
  };

  const onPointClick = (point: object) => {
    const c = point as GlobeCountry;
    if (c.active) toggle(c.code);
    else show(`${c.name} — coming in Phase 2. Italy is live!`);
  };

  const destinationLabel = selected
    .map((code) => GLOBE_COUNTRIES.find((g) => g.code === code)?.name ?? code)
    .join(" · ");

  const plan = () => {
    if (!selected.length || launching) return;
    setLaunching(true);
    // Let the warp transition play before routing to the wizard.
    setTimeout(() => router.push(`/plan?countries=${selected.join(",")}`), 1150);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0">
        {size.width > 0 && (
          <Globe
            width={size.width}
            height={size.height}
            backgroundColor="rgba(0,0,0,0)"
            globeMaterial={navyGlobeMaterial}
            showAtmosphere
            atmosphereColor="#00E5C3"
            atmosphereAltitude={0.18}
            polygonsData={landPolygons}
            polygonAltitude={0.006}
            polygonCapColor={() => "rgba(36,60,99,0.75)"}
            polygonSideColor={() => "rgba(0,0,0,0)"}
            polygonStrokeColor={() => "rgba(0,229,195,0.35)"}
            pointsData={points}
            pointLat={(d: object) => (d as GlobeCountry).lat}
            pointLng={(d: object) => (d as GlobeCountry).lng}
            pointColor={(d: object) => ((d as GlobeCountry).active ? "#00E5C3" : "#39557a")}
            pointAltitude={(d: object) => ((d as GlobeCountry).active ? 0.06 : 0.02)}
            pointRadius={(d: object) => ((d as GlobeCountry).active ? 0.6 : 0.4)}
            pointLabel={(d: object) => {
              const c = d as GlobeCountry;
              return `<div style="font-family:Inter,sans-serif;color:#e2e8f0">
                <strong>${c.name}</strong><br/>${c.active ? "🟢 Live — tap to select" : "🔒 Phase 2"}
              </div>`;
            }}
            onPointClick={onPointClick}
            ringsData={rings}
            ringColor={() => "#00E5C3"}
            ringMaxRadius={4}
            ringPropagationSpeed={1.4}
            ringRepeatPeriod={1200}
          />
        )}
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-0 p-6">
        <h1 className="wp-display text-4xl tracking-tight text-white md:text-5xl">
          Wander<span style={{ color: "#00E5C3" }}>Plan</span>
        </h1>
        <p className="mt-1 max-w-md text-sm text-slate-400 md:text-base">
          Spin the globe. Pick a country. We&apos;ll build the trip around what you actually
          love.
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 p-5">
        <div className="flex flex-wrap justify-center gap-2">
          {selected.map((code) => {
            const c = GLOBE_COUNTRIES.find((g) => g.code === code);
            return (
              <button
                key={code}
                onClick={() => toggle(code)}
                className="rounded-full border px-3 py-1.5 text-sm font-medium transition-all"
                style={{
                  background: "rgba(0,229,195,0.12)",
                  borderColor: "#00E5C3",
                  color: "#00E5C3",
                }}
              >
                {c?.name} ✕
              </button>
            );
          })}
          {!selected.length && (
            <span className="text-sm text-slate-500">
              Tap the glowing marker — Italy is live
            </span>
          )}
        </div>
        <button
          disabled={!selected.length}
          onClick={plan}
          className="rounded-full px-8 py-3 text-base font-semibold transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            background: "#00E5C3",
            color: "#06281f",
            boxShadow: selected.length ? "0 0 40px rgba(0,229,195,0.35)" : "none",
          }}
        >
          Plan This Trip →
        </button>
      </div>
      {toast}
      {launching && <LaunchTransition destinationLabel={destinationLabel} />}
    </div>
  );
}
