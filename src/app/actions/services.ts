"use server";

import { requireRole, canManageService, getMyArtistId } from "@/lib/auth";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const ServiceInput = z.object({
  name: z.string().min(1).max(80),
  durationMinutes: z.number().int().min(15).max(600),
  depositCents: z.number().int().min(0),
  artistId: z.uuid().optional(),
});

type Result =
  { ok: true } | { ok: false; error: "invalid" | "forbidden" | "no_artist" };

export async function createService(raw: unknown): Promise<Result> {
  const user = await requireRole("owner", "artist");

  const parsed = ServiceInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { name, durationMinutes, depositCents, artistId } = parsed.data;

  let targetArtistId: string | null;
  if (user.role === "owner") {
    targetArtistId = artistId ?? null;
  } else {
    targetArtistId = await getMyArtistId(user.id);
  }
  if (!targetArtistId) return { ok: false, error: "no_artist" };

  await db.insert(services).values({
    artistId: targetArtistId,
    name,
    durationMinutes,
    depositCents,
  });

  revalidatePath("/dashboard/services");
  return { ok: true };
}

export async function updateService(
  serviceId: string,
  raw: unknown,
): Promise<Result> {
  const user = await requireRole("owner", "artist");

  if (!(await canManageService(user, serviceId))) {
    return { ok: false, error: "forbidden" };
  }

  const parsed = ServiceInput.omit({ artistId: true }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  await db.update(services).set(parsed.data).where(eq(services.id, serviceId));

  revalidatePath("/dashboard/services");
  return { ok: true };
}

export async function archiveService(serviceId: string): Promise<Result> {
  const user = await requireRole("owner", "artist");

  if (!(await canManageService(user, serviceId))) {
    return { ok: false, error: "forbidden" };
  }

  await db
    .update(services)
    .set({ active: false })
    .where(eq(services.id, serviceId));

  revalidatePath("/dashboard/services");
  return { ok: true };
}
