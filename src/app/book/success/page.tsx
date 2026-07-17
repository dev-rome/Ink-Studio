import { db } from "@/db";
import { bookings, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const { booking: bookingId } = await searchParams;
  const user = await requireUser();

  if (!bookingId) {
    return (
      <p className="p-6 text-sm text-neutral-500">No booking specified.</p>
    );
  }

  const [row] = await db
    .select({
      status: bookings.status,
      clientId: bookings.clientId,
      during: sessions.during,
    })
    .from(bookings)
    .innerJoin(sessions, eq(sessions.bookingId, bookings.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row || row.clientId !== user.id) {
    return (
      <div className="mx-auto max-w-md space-y-2 p-6">
        <h1 className="text-lg font-medium text-neutral-700">
          Booking not found.
        </h1>
        <p className="text-sm text-neutral-500">
          This booking may have expired. Please start again.
        </p>
      </div>
    );
  }

  const paid = row.status === "deposit_paid";
  const pending = row.status === "pending_payment";

  return (
    <div className="mx-auto max-w-md space-y-2 p-6">
      {paid && (
        <>
          <h1 className="text-lg font-medium text-green-700">
            Deposit paid — you&apos;re booked.
          </h1>
          <p className="text-sm text-neutral-500">
            {formatSession(row.during)}
          </p>
        </>
      )}

      {pending && (
        <>
          <h1 className="text-lg font-medium text-amber-700">
            Payment processing…
          </h1>
          <p className="text-sm text-neutral-500">
            {formatSession(row.during)}
          </p>
          <p className="text-sm text-neutral-500">
            This usually takes a few seconds. Refresh to update.
          </p>
        </>
      )}

      {!paid && !pending && (
        <>
          <h1 className="text-lg font-medium text-neutral-700">
            This booking didn&apos;t complete.
          </h1>
          <p className="text-sm text-neutral-500">Please start again.</p>
        </>
      )}
    </div>
  );
}

function formatSession(during: string): string {
  const match = during.match(/\["([^"]+)"/);
  if (!match) return "";
  return new Date(match[1]).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
