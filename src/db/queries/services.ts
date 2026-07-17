import "server-only";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

// Derived from the schema — change a column type there and this
// follows automatically. No hand-maintained field list to drift.
type ServiceRow = typeof services.$inferSelect;
export type Service = Pick<
  ServiceRow,
  "id" | "name" | "durationMinutes" | "depositCents"
>;

export async function getArtistServices(artistId: string): Promise<Service[]> {
  return db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      depositCents: services.depositCents,
    })
    .from(services)
    .where(and(eq(services.artistId, artistId), eq(services.active, true)))
    .orderBy(asc(services.durationMinutes));
}
