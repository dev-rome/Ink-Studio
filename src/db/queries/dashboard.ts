import "server-only";
import { db } from "@/db";
import { bookings, sessions, services, users, artists } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { STUDIO_TZ } from "@/lib/config";
import type { Role } from "@/db/schema";
import type { BookingStatus } from "@/lib/booking-status";

export type DashboardBooking = {
  sessionId: string;
  start: Date;
  end: Date;
  serviceName: string | null;
  clientName: string;
  status: BookingStatus;
};

export async function getTodaysBookings(
  role: Role,
  userId: string,
): Promise<DashboardBooking[]> {
  const dayWindow = sql`tstzrange(
    (current_date AT TIME ZONE ${STUDIO_TZ}),
    ((current_date + 1) AT TIME ZONE ${STUDIO_TZ})
  )`;

  const conditions = [sql`${sessions.during} && ${dayWindow}`];

  if (role === "artist") {
    conditions.push(
      sql`${sessions.artistId} = (
        SELECT id FROM ${artists} WHERE ${artists.userId} = ${userId}
      )`,
    );
  }

  const rows = await db
    .select({
      sessionId: sessions.id,
      start: sql<string>`lower(${sessions.during})`,
      end: sql<string>`upper(${sessions.during})`,
      serviceName: services.name,
      clientName: users.name,
      status: bookings.status,
    })
    .from(sessions)
    .innerJoin(bookings, eq(sessions.bookingId, bookings.id))
    .innerJoin(users, eq(bookings.clientId, users.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(and(...conditions))
    .orderBy(sql`lower(${sessions.during})`);

  return rows.map((r) => ({
    ...r,
    start: new Date(r.start),
    end: new Date(r.end),
  }));
}
