"use client";

import { useEffect, useState } from "react";

/** Minimal transient toast. Returns a `show(message)` callback and the element. */
export function useToast() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2600);
    return () => clearTimeout(t);
  }, [msg]);

  const toast = msg ? (
    <div
      className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-600 px-4 py-2.5 text-sm text-slate-100 shadow-xl"
      style={{ background: "rgba(14,23,48,0.95)", backdropFilter: "blur(8px)" }}
    >
      {msg}
    </div>
  ) : null;

  return { show: setMsg, toast };
}
