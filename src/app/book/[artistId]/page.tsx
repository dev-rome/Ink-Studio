import { getAvailability } from "@/db/queries/availability";
import { gapsToSlots } from "@/lib/slots";
import { SlotPicker } from "@/app/book/[artistId]/slot-picker";

export default async function BookPage({
  params,
}: {
  params: Promise<{ artistId: string }>;
}) {
  const { artistId } = await params;
  const date = "2026-08-01";
  const durationMin = 120;

  const gaps = await getAvailability(artistId, date, durationMin);
  const slots = gapsToSlots(gaps, durationMin);

  const slotData = slots.map((s) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-lg font-medium">Book a session</h1>
      <p className="text-sm text-neutral-500">
        {date} · {durationMin} min
      </p>
      <SlotPicker artistId={artistId} type="sitting" slots={slotData} />
    </div>
  );
}
