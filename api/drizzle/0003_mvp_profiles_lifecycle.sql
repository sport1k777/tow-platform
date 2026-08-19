ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'driver_en_route';
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'arrived';
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE "cancelled_by" ADD VALUE IF NOT EXISTS 'admin';

DO $$ BEGIN
  CREATE TYPE "notification_channel" AS ENUM ('dev', 'sms', 'push', 'email', 'whatsapp');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_status" AS ENUM ('queued', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" text;

ALTER TABLE "pricing_rules"
  ADD COLUMN IF NOT EXISTS "night_multiplier_bps" integer NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS "weekend_multiplier_bps" integer NOT NULL DEFAULT 10000;

ALTER TABLE "driver_profiles"
  ADD COLUMN IF NOT EXISTS "completed_orders_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rating_sum" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rating_count" integer NOT NULL DEFAULT 0;

ALTER TABLE "driver_vehicles"
  ADD COLUMN IF NOT EXISTS "plate_number" text,
  ADD COLUMN IF NOT EXISTS "capacity_kg" integer;

CREATE TABLE IF NOT EXISTS "ratings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "from_user_id" uuid NOT NULL,
  "to_user_id" uuid NOT NULL,
  "score" integer NOT NULL,
  "comment" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ratings_order_id_unique" UNIQUE("order_id"),
  CONSTRAINT "ratings_score_range" CHECK ("score" >= 1 AND "score" <= 5)
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "channel" "notification_channel" NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "notification_status" DEFAULT 'queued' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone
);

DO $$ BEGIN
  ALTER TABLE "ratings" ADD CONSTRAINT "ratings_order_id_orders_id_fk"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ratings" ADD CONSTRAINT "ratings_from_user_id_users_id_fk"
    FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ratings" ADD CONSTRAINT "ratings_to_user_id_users_id_fk"
    FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "ratings_to_user_idx" ON "ratings" USING btree ("to_user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at" DESC);
