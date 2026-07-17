"use client";

import { useState } from "react";
import { createHold } from "@/app/actions/bookings";

type SlotData = { start: string; end: string };

export function SlotPicker({
  artistId,
  type,
  slots,
}: {
  artistId: string;
  type: "consultation" | "sitting";
  slots: SlotData[];
}) {
  const [selected, setSelected] = useState<SlotData | null>(null);
  const [status, setStatus] = useState<
    "idle" | "booking" | "booked" | "taken" | "error"
  >("idle");

  async function handleBook() {
    if (!selected) return;
    setStatus("booking");

    const result = await createHold({
      artistId,
      start: selected.start,
      end: selected.end,
      type,
    });

    if (result.ok) setStatus("booked");
    else if (result.error === "slot_taken") setStatus("taken");
    else setStatus("error");
  }

  if (status === "booked" && selected) {
    const label = new Date(selected.start).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return (
      <div className="space-y-1">
        <p className="text-green-700">Booked — see you then.</p>
        <p className="text-sm text-neutral-500">{label}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {slots.length === 0 && (
        <p className="text-sm text-neutral-500">No times available.</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const label = new Date(slot.start).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          });
          const isSelected = selected?.start === slot.start;
          return (
            <button
              key={slot.start}
              onClick={() => setSelected(slot)}
              className={`rounded border py-2 text-sm ${
                isSelected ? "bg-black text-white" : "hover:bg-neutral-100"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {status === "taken" && (
        <p className="text-sm text-amber-700">
          That slot was just taken. Pick another.
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong.</p>
      )}

      <button
        onClick={handleBook}
        disabled={!selected || status === "booking"}
        className="w-full rounded bg-black py-2 text-white disabled:opacity-40"
      >
        {status === "booking" ? "Booking…" : "Confirm"}
      </button>
    </div>
  );
}
