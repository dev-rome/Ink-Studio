import "server-only";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, artists, services, type Role } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!profile) redirect("/login");
  return profile;
}

export async function requireRole(...allowed: Role[]) {
  const user = await requireUser();
  if (!allowed.includes(user.role as Role)) {
    redirect("/");
  }
  return user;
}

export async function canManageService(
  user: { id: string; role: Role },
  serviceId: string,
): Promise<boolean> {
  if (user.role === "owner") return true;
  if (user.role !== "artist") return false;

  const [row] = await db
    .select({ serviceArtistId: services.artistId })
    .from(services)
    .innerJoin(artists, eq(artists.id, services.artistId))
    .where(and(eq(services.id, serviceId), eq(artists.userId, user.id)))
    .limit(1);

  return Boolean(row);
}

export async function getMyArtistId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.userId, userId))
    .limit(1);
  return row?.id ?? null;
}
