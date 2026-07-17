"use client";

export default function BookingError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md space-y-3 p-6">
      <h1 className="text-lg font-medium text-neutral-700">
        Couldn&apos;t load booking options.
      </h1>
      <p className="text-sm text-neutral-500">
        Something went wrong on our end. Please try again.
      </p>
      <button onClick={reset} className="text-sm text-neutral-700 underline">
        Try again
      </button>
    </div>
  );
}
