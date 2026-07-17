import { getArtistServices } from "@/db/queries/services";
import { BookingFlow } from "./booking-flow";

export default async function BookPage({
  params,
}: {
  params: Promise<{ artistId: string }>;
}) {
  const { artistId } = await params;
  const services = await getArtistServices(artistId);

  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-lg font-medium">Book a session</h1>
      {services.length === 0 ? (
        <p className="text-sm text-neutral-500">
          This artist has no services available.
        </p>
      ) : (
        <BookingFlow artistId={artistId} services={services} />
      )}
    </div>
  );
}
