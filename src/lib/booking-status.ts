import type { bookings } from "@/db/schema";

export type BookingStatus = (typeof bookings.$inferSelect)["status"];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_payment: "Awaiting payment",
  enquiry: "Enquiry",
  deposit_paid: "Deposit paid",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_STYLE: Record<BookingStatus, string> = {
  pending_payment: "text-amber-700",
  enquiry: "text-neutral-500",
  deposit_paid: "text-green-700",
  confirmed: "text-green-700",
  completed: "text-neutral-500",
  cancelled: "text-red-600",
};
