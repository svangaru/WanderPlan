"use client";

import { useMemo } from "react";
import type { ItineraryDay } from "@/lib/itinerary/schema";

/**
 * SVG Italy map with the trip route drawn between day cities. This is the
 * no-token fallback for the Phase C Mapbox view (CLAUDE.md): it renders without
 * NEXT_PUBLIC_MAPBOX_TOKEN. City coordinates are supplied by the server from
 * the grounding experiences.
 */

// prettier-ignore
const MAINLAND: [number, number][] = [[7.5,43.85],[7.0,44.25],[7.6,45.1],[6.8,45.85],[7.85,45.92],[8.45,46.45],[9.3,46.5],[10.1,46.6],[11.1,46.95],[12.15,47.08],[13.5,46.55],[13.7,45.6],[13.1,45.65],[12.45,45.45],[12.25,45.2],[12.5,44.85],[12.25,44.7],[12.4,44.2],[13.55,43.6],[14.0,42.65],[14.85,42.05],[15.15,41.93],[16.0,41.95],[16.2,41.7],[15.9,41.5],[17.3,40.9],[18.0,40.65],[18.5,40.1],[18.35,39.8],[17.9,40.25],[17.2,40.45],[16.85,40.4],[16.6,40.1],[16.55,39.6],[17.1,39.0],[16.55,38.7],[16.55,38.4],[16.05,37.92],[15.65,38.0],[15.65,38.25],[15.85,38.65],[16.2,38.95],[15.95,39.4],[15.7,39.95],[15.25,40.0],[14.9,40.25],[14.75,40.65],[14.45,40.6],[14.05,40.8],[13.7,41.25],[13.1,41.25],[12.6,41.45],[11.75,42.1],[11.1,42.4],[10.7,42.95],[10.5,43.3],[10.25,43.85],[9.85,44.05],[9.2,44.32],[8.75,44.42],[8.15,43.95],[7.5,43.85]];
// prettier-ignore
const SICILY: [number, number][] = [[12.45,37.8],[13.3,38.2],[14.5,38.05],[15.1,38.15],[15.55,38.0],[15.1,37.35],[15.3,37.1],[15.1,36.66],[14.3,36.78],[12.9,37.58],[12.45,37.8]];
// prettier-ignore
const SARDINIA: [number, number][] = [[8.2,40.9],[8.5,40.85],[9.2,41.25],[9.55,41.15],[9.65,40.5],[9.75,40.0],[9.65,39.18],[9.05,39.05],[8.4,38.95],[8.35,39.75],[8.4,40.3],[8.2,40.9]];

const project = (lon: number, lat: number): [number, number] => [
  ((lon - 6.4) / (18.8 - 6.4)) * 340 + 10,
  ((47.3 - lat) / (47.3 - 36.4)) * 480 + 10,
];
const polygon = (pts: [number, number][]) =>
  "M" + pts.map(([lo, la]) => project(lo, la).map((n) => n.toFixed(1)).join(",")).join("L") + "Z";

interface Stop {
  city: string;
  lat: number;
  lng: number;
  firstDay: number;
  lastDay: number;
}

export function ItalyMap({
  days,
  cityCoords,
}: {
  days: ItineraryDay[];
  cityCoords: Record<string, { lat: number; lng: number }>;
}) {
  const stops = useMemo<Stop[]>(() => {
    const seen: Stop[] = [];
    days.forEach((d) => {
      const coord = cityCoords[d.city] ?? { lat: 41.9, lng: 12.5 };
      const last = seen[seen.length - 1];
      if (!last || last.city !== d.city) {
        seen.push({ city: d.city, lat: coord.lat, lng: coord.lng, firstDay: d.day_number, lastDay: d.day_number });
      } else {
        last.lastDay = d.day_number;
      }
    });
    return seen;
  }, [days, cityCoords]);

  const pathD =
    stops.length > 1
      ? "M" + stops.map((s) => project(s.lng, s.lat).map((n) => n.toFixed(1)).join(",")).join("L")
      : "";

  // Declutter labels: markers stay at true positions, but text labels are pushed
  // down so close stops (e.g. Naples + Amalfi) don't overlap. A leader line
  // connects a moved label back to its marker.
  const LABEL_GAP = 24;
  const placed = stops
    .map((s, i) => {
      const [x, y] = project(s.lng, s.lat);
      return { s, i, x, y, labelY: y };
    })
    .sort((a, b) => a.y - b.y);
  let lastLabelY = -Infinity;
  for (const p of placed) {
    if (p.labelY < lastLabelY + LABEL_GAP) p.labelY = lastLabelY + LABEL_GAP;
    lastLabelY = p.labelY;
  }

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 360 500" className="w-full max-w-sm">
        <defs>
          <linearGradient id="routeG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00E5C3" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
        {[MAINLAND, SICILY, SARDINIA].map((p, i) => (
          <path key={i} d={polygon(p)} fill="#13213d" stroke="#27406b" strokeWidth="1" />
        ))}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="url(#routeG)"
            strokeWidth="2.5"
            strokeDasharray="6 5"
            strokeLinecap="round"
            className="wp-route"
          />
        )}
        {placed.map(({ s, i, x, y, labelY }) => {
          const moved = Math.abs(labelY - y) > 3;
          return (
            <g key={s.city + i}>
              {moved && (
                <line
                  x1={x + 9}
                  y1={y}
                  x2={x + 12}
                  y2={labelY}
                  stroke="#27406b"
                  strokeWidth="0.75"
                />
              )}
              <circle cx={x} cy={y} r="9" fill="#0A0F1E" stroke="#00E5C3" strokeWidth="1.5" />
              <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fill="#00E5C3" fontWeight="700">
                {i + 1}
              </text>
              <text x={x + 14} y={labelY + 2} fontSize="10" fill="#cbd5e1">
                {s.city}
              </text>
              <text x={x + 14} y={labelY + 12.5} fontSize="8" fill="#64748b">
                Day {s.firstDay}
                {s.lastDay !== s.firstDay ? `–${s.lastDay}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
