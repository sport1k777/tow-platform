ALTER TYPE "verification_status" ADD VALUE IF NOT EXISTS 'incomplete';
--> statement-breakpoint
ALTER TYPE "verification_status" ADD VALUE IF NOT EXISTS 'expired';
--> statement-breakpoint
CREATE TYPE "document_type" AS ENUM (
  'drivers_license',
  'identity',
  'vehicle_registration',
  'insurance'
);
--> statement-breakpoint
CREATE TYPE "document_status" AS ENUM (
  'not_submitted',
  'uploaded',
  'processing',
  'needs_review',
  'approved',
  'rejected',
  'expired'
);
--> statement-breakpoint
CREATE TYPE "verification_event_action" AS ENUM (
  'DOCUMENT_UPLOADED',
  'DOCUMENT_PROCESSING',
  'DOCUMENT_APPROVED',
  'DOCUMENT_REJECTED',
  'DOCUMENT_REPLACED',
  'DOCUMENT_EXPIRED',
  'DRIVER_APPROVED',
  'DRIVER_REJECTED',
  'DRIVER_SUSPENDED',
  'DRIVER_REACTIVATED',
  'REUPLOAD_REQUESTED'
);
--> statement-breakpoint
CREATE TYPE "verification_method" AS ENUM (
  'none',
  'manual_review',
  'external_provider'
);
