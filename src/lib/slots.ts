import type { Gap } from "@/db/queries/availability";

export type Slot = { start: Date; end: Date };

/**
 * Turn free-time gaps into bookable start times.
 * Pure: no DB, no React — just gaps in, slots out.
 *
 * @param gaps           free ranges from getAvailability
 * @param durationMin    length of the session being booked
 * @param granularityMin spacing between offered starts (default 30)
 */

export function gapsToSlots(
  gaps: Gap[],
  durationMin: number,
  granularityMin = 30,
): Slot[] {
  const slots: Slot[] = [];
  const durationMs = durationMin * 60_000;
  const stepMs = granularityMin * 60_000;

  for (const gap of gaps) {
    let start = ceilToGranularity(gap.start, granularityMin);

    while (start.getTime() + durationMs <= gap.end.getTime()) {
      slots.push({
        start: new Date(start),
        end: new Date(start.getTime() + durationMs),
      });
      start = new Date(start.getTime() + stepMs);
    }
  }

  return slots;
}

function ceilToGranularity(date: Date, granularityMin: number): Date {
  const ms = granularityMin * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}
