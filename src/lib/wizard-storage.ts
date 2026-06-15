import type { Preferences, TripInput } from "@/lib/types";

/**
 * Persists wizard state across the Google OAuth round-trip. Signing in triggers
 * a full page reload that would otherwise wipe the in-memory wizard state, so we
 * stash it (and a "resume generation" intent) in sessionStorage and rehydrate on
 * return. sessionStorage is tab-scoped and clears when the tab closes.
 */

const STATE_KEY = "wp_wizard_state";
const RESUME_KEY = "wp_resume_gen";

export interface WizardState {
  trip: TripInput;
  prefs: Preferences;
  step: number;
}

export function loadWizardState(): WizardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as WizardState) : null;
  } catch {
    return null;
  }
}

export function saveWizardState(state: WizardState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* quota / disabled storage — non-fatal */
  }
}

/** Marks intent to resume generation after the auth redirect. */
export function setResumeGeneration(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RESUME_KEY, "1");
}

/** Returns true once, then clears the flag (so it fires a single time). */
export function consumeResumeGeneration(): boolean {
  if (typeof window === "undefined") return false;
  const flag = sessionStorage.getItem(RESUME_KEY);
  if (flag) sessionStorage.removeItem(RESUME_KEY);
  return flag === "1";
}
