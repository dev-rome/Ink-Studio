import { requireUser } from "@/lib/auth";

export default async function Test() {
  const user = await requireUser();
  return <pre>{JSON.stringify(user, null, 2)}</pre>;
}
