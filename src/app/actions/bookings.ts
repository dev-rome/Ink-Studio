"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { bookings, sessions } from "@/db/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { isRecord } from "@/lib/guards";

const CreateHoldInput = z
  .object({
    artistId: z.uuid(),
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
  | { ok: false; error: "slot_taken" | "invalid" | "unauthorized" };

export async function createHold(raw: unknown): Promise<Result> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "unauthorized" };
  }

  const parsed = CreateHoldInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { artistId, start, end, type, description } = parsed.data;

  const during = `[${start},${end})`;

  try {
    const bookingId = await db.transaction(async (tx) => {
      const [booking] = await tx
        .insert(bookings)
        .values({
          clientId: user.id,
          artistId,
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
