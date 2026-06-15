"use client";

import type { SliderDef } from "@/lib/constants";

export function PrefSlider({
  def,
  value,
  color,
  onChange,
}: {
  def: SliderDef;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-sm text-slate-300">
          <span className="mr-1.5">{def.icon}</span>
          {def.label}
        </label>
        <span className="font-mono text-xs" style={{ color }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="wp-slider w-full"
        style={{ ["--c" as string]: color, ["--p" as string]: `${value}%` }}
      />
      {def.ends && (
        <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
          <span>{def.ends[0]}</span>
          <span>{def.ends[1]}</span>
        </div>
      )}
    </div>
  );
}
