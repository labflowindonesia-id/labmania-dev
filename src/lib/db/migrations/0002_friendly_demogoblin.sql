CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"document_type" varchar(20) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100) DEFAULT 'application/pdf',
	"catalog_type" varchar(20) NOT NULL,
	"catalog_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sample_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_name" varchar(255) NOT NULL,
	"matrix" varchar(100),
	"storage_location" "storage_location" NOT NULL,
	"form" "item_form" NOT NULL,
	"photo" text,
	"minimum_stock_level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_cost_log_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_cost_log_id" uuid NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"catalog_id" uuid,
	"warehouse_item_id" uuid,
	"warehouse_chemical_id" uuid,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(50),
	"unit_cost" numeric(15, 4) NOT NULL,
	"total_cost" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_cost_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_set_id" uuid,
	"training_name" varchar(255) NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"executed_by" uuid,
	"executed_by_name" varchar(100),
	"participants" integer NOT NULL,
	"sets_used" integer DEFAULT 1 NOT NULL,
	"total_cost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"idempotency_key" varchar(64),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "training_cost_logs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"contact" text NOT NULL,
	"issue" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reagent_catalog" ADD COLUMN "coa_document" text;--> statement-breakpoint
ALTER TABLE "standard_catalog" ADD COLUMN "coa_document" text;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "unit_cost" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "total_cost" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "warehouse_item_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "warehouse_type" varchar(20);--> statement-breakpoint
ALTER TABLE "warehouse_chemicals" ADD COLUMN "total_price" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "warehouse_chemicals" ADD COLUMN "unit_cost_base" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "warehouse_items" ADD COLUMN "unit_cost" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "serial_number" varchar(255);--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "asset_number" varchar(255);--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "purchase_date" date;--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "calibration_vendor_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "pic_name" varchar(100);--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_cost_log_items" ADD CONSTRAINT "training_cost_log_items_training_cost_log_id_training_cost_logs_id_fk" FOREIGN KEY ("training_cost_log_id") REFERENCES "public"."training_cost_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_cost_logs" ADD CONSTRAINT "training_cost_logs_training_set_id_training_sets_id_fk" FOREIGN KEY ("training_set_id") REFERENCES "public"."training_sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_cost_logs" ADD CONSTRAINT "training_cost_logs_executed_by_profiles_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;