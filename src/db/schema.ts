import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  smallint,
  time,
  jsonb,
  pgEnum,
  unique,
  check,
  customType,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["client", "artist", "owner"]);
export type Role = (typeof userRole.enumValues)[number];

export const tstzrange = customType<{ data: string }>({
  dataType() {
    return "tstzrange";
  },
});

export const bookingStatus = pgEnum("booking_status", [
  "pending_payment",
  "enquiry",
  "deposit_paid",
  "confirmed",
  "completed",
  "cancelled",
]);

export const sessionType = pgEnum("session_type", ["consultation", "sitting"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("client"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  bio: text("bio"),
  specialties: text("specialties").array(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => users.id),
  artistId: uuid("artist_id")
    .notNull()
    .references(() => artists.id),
  status: bookingStatus("status").notNull().default("enquiry"),
  serviceId: uuid("service_id").references(() => services.id),
  description: text("description"),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }),
  depositCentsSnapshot: integer("deposit_cents_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id")
    .notNull()
    .references(() => artists.id),
  bookingId: uuid("booking_id").references(() => bookings.id),
  type: sessionType("type").notNull(),
  during: tstzrange("during").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id),
    dayOfWeek: smallint("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (t) => [
    unique("working_hours_unique").on(t.artistId, t.dayOfWeek),
    check("day_of_week_valid", sql`${t.dayOfWeek} BETWEEN 0 AND 6`),
    check("hours_valid", sql`${t.endTime} > ${t.startTime}`),
  ],
);

export const timeOff = pgTable("time_off", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id")
    .notNull()
    .references(() => artists.id),
  during: tstzrange("during").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const enquiries = pgTable("enquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => users.id),
  artistId: uuid("artist_id").references(() => artists.id),
  rawText: text("raw_text").notNull(),
  parsedIntent: jsonb("parsed_intent"),
  bookingId: uuid("booking_id").references(() => bookings.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id")
    .notNull()
    .references(() => artists.id),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  depositCents: integer("deposit_cents").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
