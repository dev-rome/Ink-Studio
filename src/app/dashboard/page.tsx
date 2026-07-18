import { requireRole } from "@/lib/auth";
import { getTodaysBookings } from "@/db/queries/dashboard";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/booking-status";
import type { BookingStatus } from "@/lib/booking-status";

export default async function DashboardPage() {
  const user = await requireRole("owner", "artist");
  const rows = await getTodaysBookings(user.role, user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div>
        <h1 className="text-lg font-medium">Today</h1>
        <p className="text-sm text-neutral-500">
          {new Date().toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No sessions today.</p>
      ) : (
        <div className="divide-y">
          {rows.map((r) => (
            <div
              key={r.sessionId}
              className="flex items-center justify-between py-3"
            >
              <div>
                <div className="font-medium">
                  {r.start.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" – "}
                  {r.end.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-sm text-neutral-500">
                  {r.serviceName ?? "Session"} · {r.clientName}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`text-sm ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
