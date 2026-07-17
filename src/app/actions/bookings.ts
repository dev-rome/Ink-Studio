"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { bookings, sessions, services } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { z } from "zod";
import { isRecord } from "@/lib/guards";
import { stripe } from "@/lib/stripe";
import { getAvailability } from "@/db/queries/availability";
import { gapsToSlots } from "@/lib/slots";

const CreateHoldInput = z
  .object({
    artistId: z.uuid(),
    serviceId: z.uuid(),
    start: z.iso.datetime(),
    end: z.iso.datetime(),
    type: z.enum(["consultation", "sitting"]),
    description: z.string().max(500).optional(),
  })
  .refine((d) => new Date(d.end) > new Date(d.start), {
    message: "end must be after start",
    path: ["end"],
  });

type Result =
  | { ok: true; bookingId: string }
  | { ok: false; error: "slot_taken" | "invalid" };

export async function createHold(raw: unknown): Promise<Result> {
  const user = await requireUser();

  const parsed = CreateHoldInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { artistId, serviceId, start, end, type, description } = parsed.data;

  const [service] = await db
    .select({
      artistId: services.artistId,
      depositCents: services.depositCents,
      active: services.active,
    })
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);

  if (!service || service.artistId !== artistId || !service.active) {
    return { ok: false, error: "invalid" };
  }

  const during = `[${start},${end})`;

  try {
    const bookingId = await db.transaction(async (tx) => {
      const [booking] = await tx
        .insert(bookings)
        .values({
          clientId: user.id,
          artistId,
          serviceId,
          depositCentsSnapshot: service.depositCents,
          status: "pending_payment",
          description,
        })
        .returning({ id: bookings.id });

      await tx.insert(sessions).values({
        artistId,
        bookingId: booking.id,
        type,
        during: sql`${during}::tstzrange`,
      });

      return booking.id;
    });

    return { ok: true, bookingId };
  } catch (err) {
    if (isRecord(err) && err.code === "23P01") {
      return { ok: false, error: "slot_taken" };
    }
    throw err;
  }
}

export async function createCheckout(bookingId: string): Promise<
  | { ok: true; url: string }
  | {
      ok: false;
      error:
        | "not_found"
        | "forbidden"
        | "not_pending"
        | "no_deposit"
        | "stripe_error";
    }
> {
  const user = await requireUser();

  const [booking] = await db
    .select({
      clientId: bookings.clientId,
      status: bookings.status,
      artistId: bookings.artistId,
      depositCentsSnapshot: bookings.depositCentsSnapshot,
      serviceName: services.name,
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) return { ok: false, error: "not_found" };
  if (booking.clientId !== user.id) return { ok: false, error: "forbidden" };
  if (booking.status !== "pending_payment") {
    return { ok: false, error: "not_pending" };
  }

  const amount = booking.depositCentsSnapshot;
  if (!amount) return { ok: false, error: "no_deposit" };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: booking.serviceName
              ? `${booking.serviceName} — deposit`
              : "Session deposit",
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    metadata: { bookingId },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/success?booking=${bookingId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/${booking.artistId}`,
  });

  if (!session.url) return { ok: false, error: "stripe_error" };
  return { ok: true, url: session.url };
}

export async function getSlotsForService(
  artistId: string,
  date: string,
  durationMinutes: number,
): Promise<{ start: string; end: string }[]> {
  const gaps = await getAvailability(artistId, date, durationMinutes);
  const slots = gapsToSlots(gaps, durationMinutes);
  return slots.map((s) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
  }));
}
