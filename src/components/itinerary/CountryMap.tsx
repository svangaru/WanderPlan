"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ItineraryDay } from "@/lib/itinerary/schema";

/**
 * Generic Mapbox GL map for any country.
 * Draws trip route connecting cities, shows day markers.
 * Requires NEXT_PUBLIC_MAPBOX_TOKEN to be set.
 */

export function CountryMap({
  days,
  cityCoords,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  countryName,
}: {
  days: ItineraryDay[];
  cityCoords: Record<string, { lat: number; lng: number }>;
  countryName: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      // Token not set; don't render
      return;
    }

    mapboxgl.accessToken = token;

    // Extract coordinates for all cities in the trip
    const stops = days
      .reduce(
        (acc, day) => {
          const coord = cityCoords[day.city];
          if (coord && (!acc.length || acc[acc.length - 1].city !== day.city)) {
            acc.push({
              city: day.city,
              lat: coord.lat,
              lng: coord.lng,
              dayNumber: day.day_number,
            });
          }
          return acc;
        },
        [] as Array<{ city: string; lat: number; lng: number; dayNumber: number }>,
      )

    if (stops.length === 0) return;

    // Calculate bounds to fit all stops
    const lats = stops.map((s) => s.lat);
    const lngs = stops.map((s) => s.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const padding = 0.1;
    const latPadding = (maxLat - minLat) * padding || 0.5;
    const lngPadding = (maxLng - minLng) * padding || 0.5;

    const bounds: [number, number, number, number] = [
      minLng - lngPadding,
      minLat - latPadding,
      maxLng + lngPadding,
      maxLat + latPadding,
    ];

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      bounds,
      fitBoundsOptions: { padding: 40 },
    });

    map.current.on("load", () => {
      if (!map.current) return;

      // Add route line source
      const routeCoords = stops.map((s) => [s.lng, s.lat]);
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: routeCoords,
          },
          properties: {},
        },
      });

      // Add route line layer
      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#00E5C3",
          "line-width": 3,
          "line-opacity": 0.8,
          "line-dasharray": [2, 2],
        },
      });

      // Add day markers
      stops.forEach((stop) => {
        const el = document.createElement("div");
        el.className = "flex items-center justify-center w-8 h-8 rounded-full font-semibold text-xs bg-teal-500 text-slate-900 border-2 border-teal-300";
        el.textContent = String(stop.dayNumber);

        new mapboxgl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div class="text-sm text-slate-900"><strong>${stop.city}</strong><br/>Day ${stop.dayNumber}</div>`,
            ),
          )
          .addTo(map.current!);
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [days, cityCoords]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-slate-700">
      <div ref={mapContainer} style={{ width: "100%", height: "400px" }} />
    </div>
  );
}
