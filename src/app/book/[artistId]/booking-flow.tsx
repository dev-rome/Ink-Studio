"use client";

import { useState } from "react";
import {
  createHold,
  createCheckout,
  getSlotsForService,
} from "@/app/actions/bookings";
import type { Service } from "@/db/queries/services";

type SlotData = { start: string; end: string };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingFlow({
  artistId,
  services,
}: {
  artistId: string;
  services: Service[];
}) {
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<string>(todayStr());
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [selected, setSelected] = useState<SlotData | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "booking" | "taken" | "error"
  >("idle");

  async function refreshSlots(svc: Service | null, forDate: string) {
    if (!svc) return;
    setSelected(null);
    setStatus("loading");
    const result = await getSlotsForService(
      artistId,
      forDate,
      svc.durationMinutes,
    );
    setSlots(result);
    setStatus("idle");
  }

  function pickService(svc: Service) {
    setService(svc);
    refreshSlots(svc, date);
  }

  function changeDate(newDate: string) {
    setDate(newDate);
    refreshSlots(service, newDate);
  }

  async function handleBook() {
    if (!selected || !service) return;
    setStatus("booking");

    const hold = await createHold({
      artistId,
      serviceId: service.id,
      start: selected.start,
      end: selected.end,
      type: service.durationMinutes <= 30 ? "consultation" : "sitting",
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
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-neutral-500">Choose a service</p>
        <div className="space-y-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => pickService(s)}
              className={`w-full rounded border p-3 text-left ${
                service?.id === s.id ? "border-black" : "hover:bg-neutral-50"
              }`}
            >
              <div className="flex justify-between">
                <span>{s.name}</span>
                <span className="text-neutral-500">
                  ${(s.depositCents / 100).toFixed(2)} deposit
                </span>
              </div>
              <span className="text-sm text-neutral-400">
                {s.durationMinutes} min
              </span>
            </button>
          ))}
        </div>
      </div>

      {service && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">Choose a date</p>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => changeDate(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-neutral-500">Choose a time</p>
            {status === "loading" && (
              <p className="text-sm text-neutral-400">Loading times…</p>
            )}
            {status !== "loading" && slots.length === 0 && (
              <p className="text-sm text-neutral-500">
                No times available on this date.
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => {
                const label = new Date(slot.start).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                });
                const isSel = selected?.start === slot.start;
                return (
                  <button
                    key={slot.start}
                    onClick={() => setSelected(slot)}
                    className={`rounded border py-2 text-sm ${
                      isSel ? "bg-black text-white" : "hover:bg-neutral-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {status === "taken" && (
        <p className="text-sm text-amber-700">
          That slot was just taken. Pick another.
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong.</p>
      )}

      {selected && (
        <button
          onClick={handleBook}
          disabled={status === "booking"}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-40"
        >
          {status === "booking" ? "Booking…" : "Confirm & pay deposit"}
        </button>
      )}
    </div>
  );
}
