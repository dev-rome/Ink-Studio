import { describe, it, expect } from "vitest";
import { gapsToSlots } from "./slots";

const gap = (start: string, end: string) => ({
  start: new Date(start),
  end: new Date(end),
});

describe("gapsToSlots", () => {
  it("offers a start every 30 min while the full session fits", () => {
    const slots = gapsToSlots(
      [gap("2026-08-01T15:00:00Z", "2026-08-01T19:00:00Z")],
      120,
    );
    expect(slots).toHaveLength(5);
    expect(slots[0].start.toISOString()).toBe("2026-08-01T15:00:00.000Z");
    expect(slots.at(-1)!.start.toISOString()).toBe("2026-08-01T17:00:00.000Z");
  });

  it("returns nothing when the session is longer than the gap", () => {
    const slots = gapsToSlots(
      [gap("2026-08-01T15:00:00Z", "2026-08-01T17:00:00Z")],
      180,
    );
    expect(slots).toHaveLength(0);
  });

  it("rounds a ragged gap start UP to the grid", () => {
    const slots = gapsToSlots(
      [gap("2026-08-01T15:07:00Z", "2026-08-01T18:00:00Z")],
      60,
    );
    expect(slots[0].start.toISOString()).toBe("2026-08-01T15:30:00.000Z");
  });

  it("handles multiple gaps independently", () => {
    const slots = gapsToSlots(
      [
        gap("2026-08-01T15:00:00Z", "2026-08-01T17:00:00Z"),
        gap("2026-08-01T20:00:00Z", "2026-08-01T22:00:00Z"),
      ],
      60,
    );
    expect(slots).toHaveLength(6);
  });

  it("returns nothing for no gaps", () => {
    expect(gapsToSlots([], 60)).toHaveLength(0);
  });
});
