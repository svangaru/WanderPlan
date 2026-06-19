"use client";

import { useEffect, useState } from "react";
import { majorCities } from "@/lib/constants";

const FIELD =
  "w-full bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:border-teal-400 focus:outline-none disabled:opacity-50";
const OTHER = "__other__";

type Status = "idle" | "checking" | "valid" | "invalid" | "unknown";

/**
 * City picker: a dropdown of the country's major cities plus an "Other" option
 * that reveals a text input. Custom entries are validated (debounced) against
 * /api/cities/validate. Validation is advisory — it never blocks the user.
 */
export function CityField({
  label,
  value,
  countryCode,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  countryCode: string;
  disabled?: boolean;
  onChange: (city: string) => void;
}) {
  const cities = majorCities(countryCode);
  const [custom, setCustom] = useState(value !== "" && !cities.includes(value));
  const [status, setStatus] = useState<Status>("idle");
  const [displayName, setDisplayName] = useState("");

  // Reset mode when the country changes.
  useEffect(() => {
    setCustom(value !== "" && !majorCities(countryCode).includes(value));
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  // Debounced validation of a custom city.
  useEffect(() => {
    if (!custom || disabled) {
      setStatus("idle");
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setStatus("idle");
      return;
    }
    setStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/cities/validate?country=${countryCode}&q=${encodeURIComponent(q)}`,
        );
        const d = (await r.json()) as { valid: boolean | null; displayName?: string };
        if (d.valid === true) {
          setStatus("valid");
          setDisplayName(d.displayName?.split(",").slice(0, 2).join(", ") ?? "");
        } else if (d.valid === false) {
          setStatus("invalid");
        } else {
          setStatus("unknown");
        }
      } catch {
        setStatus("unknown");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [value, custom, countryCode, disabled]);

  return (
    <div>
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      <select
        className={FIELD}
        disabled={disabled}
        value={custom ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
      >
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={OTHER}>Other (type a city)…</option>
      </select>

      {custom && (
        <div className="mt-2">
          <input
            className={FIELD}
            placeholder="Type a city"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
          {status === "checking" && (
            <p className="mt-1 text-[11px] text-slate-500">Checking…</p>
          )}
          {status === "valid" && (
            <p className="mt-1 text-[11px] text-teal-400">✓ {displayName || "Found"}</p>
          )}
          {status === "invalid" && (
            <p className="mt-1 text-[11px] text-amber-400">
              ✗ Couldn&apos;t find that city — double-check the spelling
            </p>
          )}
          {status === "unknown" && (
            <p className="mt-1 text-[11px] text-slate-500">
              Couldn&apos;t verify right now — you can still continue
            </p>
          )}
        </div>
      )}
    </div>
  );
}
