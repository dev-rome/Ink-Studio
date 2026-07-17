"use client";

import { useState } from "react";
import { createCheckout, createHold } from "@/app/actions/bookings";

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

    const hold = await createHold({
      artistId,
      start: selected.start,
      end: selected.end,
      type,
    });

    if (!hold.ok) {
      setStatus(hold.error === "slot_taken" ? "taken" : "error");
      return;
    }

    const checkout = await createCheckout(hold.bookingId);
    if (!checkout.ok) {
      setStatus("error");
      return;
    }

    window.location.href = checkout.url;
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
