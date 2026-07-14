import { getAvailability } from "@/db/queries/availability";

export default async function Test() {
  const gaps = await getAvailability(
    "abcefeed-35a3-4b90-ac65-8b793b14b324",
    "2026-08-01",
    180,
  );
  return <pre>{JSON.stringify(gaps, null, 2)}</pre>;
}
