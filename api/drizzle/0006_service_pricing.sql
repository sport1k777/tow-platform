ALTER TYPE "public"."vehicle_category" ADD VALUE IF NOT EXISTS 'truck';
--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN IF NOT EXISTS "city_code" text;
--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN IF NOT EXISTS "option_key" text;
--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN IF NOT EXISTS "config" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "pricing_rule_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "pricing_rule_id" DROP NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "pricing_rules_lookup_idx";
--> statement-breakpoint
CREATE INDEX "pricing_rules_lookup_idx" ON "pricing_rules" USING btree ("service_key","city_code","vehicle_category","option_key","active","valid_from" DESC);
