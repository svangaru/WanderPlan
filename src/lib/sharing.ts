/**
 * Itinerary sharing utilities.
 * Generates shareable links and manages access.
 */

import { randomBytes } from "crypto";

/**
 * Generate a unique share token (32 chars, URL-safe).
 * Uses crypto-grade randomness for security.
 */
export function generateShareToken(): string {
  return randomBytes(16).toString("hex"); // 32 hex chars
}

/**
 * Build a shareable URL for an itinerary.
 * In production, replace with your actual domain.
 */
export function buildShareUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/share/${token}`;
}

/**
 * Validate a share token format.
 * Ensures it's exactly 32 hex characters.
 */
export function isValidShareToken(token: string): boolean {
  return /^[a-f0-9]{32}$/.test(token);
}
