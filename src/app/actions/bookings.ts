"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { bookings, sessions } from "@/db/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { isRecord } from "@/lib/guards";

const CreateBookingInput = z
  .object({
    artistId: z.uuid(),
    start: z.iso.datetime(),
    end: z.iso.datetime(),
    type: z.enum(["consultation", "sitting"]),
    description: z.string().max(500).optional(),
  })
  .refine((data) => new Date(data.end) > new Date(data.start), {
    message: "end must be after start",
    path: ["end"],
  });

type Result =
  | { ok: true; bookingId: string }
  | { ok: false; error: "slot_taken" | "invalid" | "unauthorized" };

export async function createBooking(raw: unknown): Promise<Result> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "unauthorized" };
  }

  const parsed = CreateBookingInput.safeParse(raw);
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
          status: "enquiry",
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

    revalidatePath("/bookings");
    return { ok: true, bookingId };
  } catch (err) {
    if (isExclusionViolation(err)) {
      return { ok: false, error: "slot_taken" };
    }
    throw err;
  }
}

function isExclusionViolation(err: unknown): boolean {
  return isRecord(err) && err.code === "23P01";
}
