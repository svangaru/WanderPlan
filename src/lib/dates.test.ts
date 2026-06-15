import { describe, it, expect } from "vitest";
import { addDays, daysBetween, dateOverlaps, formatDate } from "@/lib/dates";

describe("dates", () => {
  it("counts inclusive days between two dates", () => {
    expect(daysBetween("2026-06-20", "2026-06-27")).toBe(8);
    expect(daysBetween("2026-06-20", "2026-06-20")).toBe(1);
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-06-29", 3)).toBe("2026-07-02");
  });

  it("detects event-date overlap inclusively", () => {
    expect(dateOverlaps("2026-06-24", "2026-06-24", "2026-06-24")).toBe(true);
    expect(dateOverlaps("2026-06-15", "2026-06-12", "2026-09-05")).toBe(true);
    expect(dateOverlaps("2026-06-11", "2026-06-12", "2026-09-05")).toBe(false);
  });

  it("formats an ISO date for display", () => {
    expect(formatDate("2026-06-20")).toMatch(/Jun 20/);
  });
});
