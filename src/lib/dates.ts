/**
 * Date helpers. Dates travel as ISO `YYYY-MM-DD` strings over the wire and are
 * stored as Postgres DATE. We never do Date math during render — only here.
 */

/** Format an ISO date string for display, e.g. "Sat, Jun 20". */
export function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Add `n` days to an ISO date string, returning a new ISO date string. */
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Inclusive day count between two ISO date strings. */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;
}

/** True if ISO date `d` falls within [start, end] inclusive. */
export function dateOverlaps(d: string, start: string, end: string): boolean {
  return d >= start && d <= end;
}

/** Convert a JS Date (from Prisma DATE) to an ISO `YYYY-MM-DD` string. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
