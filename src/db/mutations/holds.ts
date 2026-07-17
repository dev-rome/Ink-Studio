import "server-only";

import { db } from "@/db";
import { bookings, sessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function expireHold(bookingId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [booking] = await tx
      .update(bookings)
      .set({ status: "cancelled" })
      .where(
        and(eq(bookings.id, bookingId), eq(bookings.status, "pending_payment")),
      )
      .returning({ id: bookings.id });

    if (!booking) return;

    await tx.delete(sessions).where(eq(sessions.bookingId, bookingId));
  });
}
