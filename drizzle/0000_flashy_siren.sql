CREATE TYPE "public"."booking_status" AS ENUM('enquiry', 'deposit_paid', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('consultation', 'sitting');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'artist', 'owner');--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"specialties" text[],
	"hourly_rate" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artists_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'enquiry' NOT NULL,
	"description" text,
	"deposit_amount" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"artist_id" uuid,
	"raw_text" text NOT NULL,
	"parsed_intent" jsonb,
	"booking_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"booking_id" uuid,
	"type" "session_type" NOT NULL,
	"during" "tstzrange" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"during" "tstzrange" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	CONSTRAINT "working_hours_unique" UNIQUE("artist_id","day_of_week"),
	CONSTRAINT "day_of_week_valid" CHECK ("working_hours"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "hours_valid" CHECK ("working_hours"."end_time" > "working_hours"."start_time")
);
--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_no_overlap"
  EXCLUDE USING gist (artist_id WITH =, during WITH &&);
--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_no_overlap"
  EXCLUDE USING gist (artist_id WITH =, during WITH &&);