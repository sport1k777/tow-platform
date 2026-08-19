-- Phase 5 order foundation: service types, pricing, quotes, orders, offers.
CREATE TYPE "public"."service_key" AS ENUM('tow', 'moving', 'cargo', 'roadside');
--> statement-breakpoint
CREATE TYPE "public"."destination_policy" AS ENUM('required', 'optional');
--> statement-breakpoint
CREATE TYPE "public"."vehicle_category" AS ENUM('car', 'suv', 'van', 'motorcycle');
--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('searching', 'offered', 'accepted', 'completed', 'cancelled', 'expired');
--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('pending', 'accepted', 'rejected', 'expired');
--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending_verification', 'under_review', 'approved', 'rejected', 'suspended');
--> statement-breakpoint
CREATE TYPE "public"."cancelled_by" AS ENUM('customer', 'driver');
--> statement-breakpoint
CREATE TABLE "service_types" (
	"key" "service_key" PRIMARY KEY NOT NULL,
	"destination_policy" "destination_policy" NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_key" "service_key" NOT NULL,
	"vehicle_category" "vehicle_category",
	"base_fee_kopiyky" integer NOT NULL,
	"per_km_kopiyky" integer NOT NULL,
	"min_fee_kopiyky" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_rules_base_fee_nonneg" CHECK ("base_fee_kopiyky" >= 0),
	CONSTRAINT "pricing_rules_per_km_nonneg" CHECK ("per_km_kopiyky" >= 0),
	CONSTRAINT "pricing_rules_min_fee_nonneg" CHECK ("min_fee_kopiyky" >= 0)
);
--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_service_key_service_types_key_fk" FOREIGN KEY ("service_key") REFERENCES "public"."service_types"("key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "pricing_rules_lookup_idx" ON "pricing_rules" USING btree ("service_key","vehicle_category","active","valid_from" DESC);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"service_key" "service_key" NOT NULL,
	"vehicle_category" "vehicle_category",
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pickup_label" text NOT NULL,
	"pickup_location" geography(Point,4326) NOT NULL,
	"destination_label" text,
	"destination_location" geography(Point,4326),
	"distance_meters" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"pricing_rule_id" uuid NOT NULL,
	"amount_kopiyky" integer NOT NULL,
	"currency" text DEFAULT 'UAH' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_amount_nonneg" CHECK ("amount_kopiyky" >= 0),
	CONSTRAINT "quotes_distance_nonneg" CHECK ("distance_meters" >= 0),
	CONSTRAINT "quotes_duration_nonneg" CHECK ("duration_seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_pricing_rule_id_pricing_rules_id_fk" FOREIGN KEY ("pricing_rule_id") REFERENCES "public"."pricing_rules"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "quotes_customer_created_idx" ON "quotes" USING btree ("customer_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "quotes_expires_idx" ON "quotes" USING btree ("expires_at");
--> statement-breakpoint
CREATE TABLE "driver_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"verification_status" "verification_status" DEFAULT 'pending_verification' NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"last_location" geography(Point,4326),
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "driver_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_user_id" uuid NOT NULL,
	"vehicle_category" "vehicle_category" NOT NULL,
	"services" "service_key"[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "driver_vehicles_services_nonempty" CHECK (cardinality("services") > 0)
);
--> statement-breakpoint
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_driver_user_id_driver_profiles_user_id_fk" FOREIGN KEY ("driver_user_id") REFERENCES "public"."driver_profiles"("user_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "driver_vehicles_driver_idx" ON "driver_vehicles" USING btree ("driver_user_id");
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"driver_id" uuid,
	"quote_id" uuid NOT NULL,
	"service_key" "service_key" NOT NULL,
	"vehicle_category" "vehicle_category",
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pickup_label" text NOT NULL,
	"pickup_location" geography(Point,4326) NOT NULL,
	"destination_label" text,
	"destination_location" geography(Point,4326),
	"distance_meters" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"pricing_rule_id" uuid NOT NULL,
	"amount_kopiyky" integer NOT NULL,
	"currency" text DEFAULT 'UAH' NOT NULL,
	"status" "order_status" NOT NULL,
	"search_expires_at" timestamp with time zone NOT NULL,
	"cancelled_by" "cancelled_by",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "orders_amount_nonneg" CHECK ("amount_kopiyky" >= 0),
	CONSTRAINT "orders_distance_nonneg" CHECK ("distance_meters" >= 0),
	CONSTRAINT "orders_duration_nonneg" CHECK ("duration_seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pricing_rule_id_pricing_rules_id_fk" FOREIGN KEY ("pricing_rule_id") REFERENCES "public"."pricing_rules"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "orders_customer_created_idx" ON "orders" USING btree ("customer_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "orders_driver_status_idx" ON "orders" USING btree ("driver_id","status");
--> statement-breakpoint
CREATE INDEX "orders_status_search_expires_idx" ON "orders" USING btree ("status","search_expires_at");
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "order_status_history_order_idx" ON "order_status_history" USING btree ("order_id","created_at");
--> statement-breakpoint
CREATE TABLE "order_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"status" "offer_status" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_offers" ADD CONSTRAINT "order_offers_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_offers" ADD CONSTRAINT "order_offers_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "order_offers_one_pending_per_order_idx" ON "order_offers" USING btree ("order_id") WHERE "order_offers"."status" = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX "order_offers_one_pending_per_driver_idx" ON "order_offers" USING btree ("driver_id") WHERE "order_offers"."status" = 'pending';
--> statement-breakpoint
CREATE INDEX "order_offers_driver_status_idx" ON "order_offers" USING btree ("driver_id","status");
--> statement-breakpoint
CREATE INDEX "order_offers_pending_expires_idx" ON "order_offers" USING btree ("expires_at") WHERE "order_offers"."status" = 'pending';
--> statement-breakpoint
INSERT INTO "service_types" ("key", "destination_policy", "active") VALUES
	('tow', 'required', true),
	('moving', 'required', true),
	('cargo', 'required', true),
	('roadside', 'optional', true);
--> statement-breakpoint
-- Placeholder staging tariffs in kopiyky. Not legal or public tariffs. Replace by inserting new versioned rows.
INSERT INTO "pricing_rules" (
	"service_key",
	"vehicle_category",
	"base_fee_kopiyky",
	"per_km_kopiyky",
	"min_fee_kopiyky",
	"active"
) VALUES
	('tow', NULL, 50000, 2500, 50000, true),
	('tow', 'car', 50000, 2500, 50000, true),
	('tow', 'suv', 65000, 3000, 65000, true),
	('tow', 'van', 80000, 3500, 80000, true),
	('tow', 'motorcycle', 35000, 2000, 35000, true),
	('moving', NULL, 80000, 4000, 80000, true),
	('cargo', NULL, 90000, 4500, 90000, true),
	('roadside', NULL, 40000, 0, 40000, true);
