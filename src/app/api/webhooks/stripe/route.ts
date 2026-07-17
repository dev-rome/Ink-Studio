import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { expireHold } from "@/db/mutations/holds";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "no signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const bookingId = event.data.object.metadata?.bookingId;
      if (!bookingId) break;

      await db
        .update(bookings)
        .set({ status: "deposit_paid" })
        .where(
          and(
            eq(bookings.id, bookingId),
            eq(bookings.status, "pending_payment"),
          ),
        );
      break;
    }

    case "checkout.session.expired": {
      const bookingId = event.data.object.metadata?.bookingId;
      if (bookingId) await expireHold(bookingId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
