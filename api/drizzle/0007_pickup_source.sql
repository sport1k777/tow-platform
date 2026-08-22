CREATE TYPE "public"."pickup_source" AS ENUM('manual_address', 'current_location', 'map_pin');
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "pickup_source" "pickup_source" DEFAULT 'manual_address' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickup_source" "pickup_source" DEFAULT 'manual_address' NOT NULL;
