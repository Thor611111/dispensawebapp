/**
 * Date utilities — single source of truth for "today" across client & server.
 *
 * All day-level queries (filtering by `day_date`, `spent_on`, `expires_on`, etc.)
 * MUST use these helpers so frontend and backend agree on what "today" means.
 *
 * Timezone: Europe/Rome (the app is Italian, server runs on UTC workers).
 */

export const APP_TZ = "Europe/Rome";

/** Format a Date as YYYY-MM-DD in the app timezone (Europe/Rome). */
export function ymd(d: Date = new Date()): string {
  // en-CA locale yields YYYY-MM-DD format
  return d.toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

/** Today as YYYY-MM-DD in the app timezone. */
export function todayYmd(): string {
  return ymd(new Date());
}

/** Parse a YYYY-MM-DD string as a local Date at midnight (no UTC drift). */
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Add N days to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDays(s: string, days: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

/** Monday-based week start for the given date (or today), as YYYY-MM-DD. */
export function weekStartYmd(date: Date = new Date()): string {
  // Build a Date representing midnight in Europe/Rome on the same calendar day
  const dayStr = ymd(date);
  const local = parseYmd(dayStr);
  const day = local.getDay(); // 0 sun..6 sat
  const diff = (day + 6) % 7; // monday-based
  local.setDate(local.getDate() - diff);
  return ymd(local);
}