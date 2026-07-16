import "server-only";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function requireUser() {
  const supabase = await createClient();

  // getUser(), NOT getSession(). getSession() reads the cookie and
  // trusts it — that's attacker-controllable input. getUser() verifies
  // the token against Supabase. Nearly every real Supabase auth
  // vulnerability traces back to this exact confusion.
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
