import { ApiError } from "./errors";

export const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateKey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * Clients send their local calendar date. Every real time zone is within one day of UTC, so
 * anything further away is rejected — this stops back-filling streaks with arbitrary dates.
 */
export function assertPlausibleLocalDate(localDate: string, now = new Date()): string {
  if (Number.isNaN(Date.parse(`${localDate}T00:00:00Z`))) throw ApiError.badRequest("Invalid date.");
  if (Math.abs(daysBetween(toDateKey(now), localDate)) > 1) {
    throw new ApiError(422, "validation_failed", "Date must be today in your time zone.", {
      errors: [{ path: "localDate", message: "Must be within one day of the current UTC date" }],
    });
  }
  return localDate;
}

/** Day number within the current meteorological season (1-based). */
export function dayOfSeason(dateKey: string): number {
  const d = new Date(`${dateKey}T00:00:00Z`);
  const month = d.getUTCMonth();
  const startMonth = month - (((month - 2) % 3) + 3) % 3; // Mar, Jun, Sep, Dec
  const start = Date.UTC(startMonth < 0 ? d.getUTCFullYear() - 1 : d.getUTCFullYear(), (startMonth + 12) % 12, 1);
  return Math.floor((d.getTime() - start) / 86_400_000) + 1;
}

/** Stable day index used to rotate daily content. */
export const dayIndex = (dateKey: string) => Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86_400_000);
