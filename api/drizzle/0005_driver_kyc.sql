ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "first_name" text,
  ADD COLUMN IF NOT EXISTS "last_name" text,
  ADD COLUMN IF NOT EXISTS "avatar_storage_key" text;
--> statement-breakpoint
ALTER TABLE "driver_vehicles"
  ADD COLUMN IF NOT EXISTS "make" text,
  ADD COLUMN IF NOT EXISTS "model" text,
  ADD COLUMN IF NOT EXISTS "year" integer,
  ADD COLUMN IF NOT EXISTS "approved" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE "driver_vehicles" SET "approved" = true WHERE "active" = true;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "driver_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "driver_user_id" uuid NOT NULL,
  "type" "document_type" NOT NULL,
  "storage_key" text NOT NULL,
  "mime_type" text NOT NULL,
  "byte_size" integer NOT NULL,
  "status" "document_status" DEFAULT 'uploaded' NOT NULL,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "rejection_reason" text,
  "verification_method" "verification_method" DEFAULT 'none' NOT NULL,
  "verified_at" timestamp with time zone,
  "verified_by" uuid,
  "extracted_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid,
  "driver_user_id" uuid NOT NULL,
  "document_id" uuid,
  "action" "verification_event_action" NOT NULL,
  "reason" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_user_id_driver_profiles_user_id_fk"
    FOREIGN KEY ("driver_user_id") REFERENCES "driver_profiles"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_verified_by_users_id_fk"
    FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_actor_user_id_users_id_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_driver_user_id_users_id_fk"
    FOREIGN KEY ("driver_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_document_id_driver_documents_id_fk"
    FOREIGN KEY ("document_id") REFERENCES "driver_documents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "driver_documents_driver_type_idx"
  ON "driver_documents" USING btree ("driver_user_id", "type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "driver_documents_status_idx"
  ON "driver_documents" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_events_driver_idx"
  ON "verification_events" USING btree ("driver_user_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_events_document_idx"
  ON "verification_events" USING btree ("document_id", "created_at" DESC);
