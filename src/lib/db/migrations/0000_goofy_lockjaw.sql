CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."item_category" AS ENUM('barang', 'consumable');--> statement-breakpoint
CREATE TYPE "public"."item_form" AS ENUM('solid', 'liquid', 'gas');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'approved', 'rejected', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('available', 'low_stock', 'out_of_stock', 'expired');--> statement-breakpoint
CREATE TYPE "public"."stock_unit" AS ENUM('unit', 'pack', 'pcs', 'set', 'roll', 'ml', 'L', 'g', 'kg');--> statement-breakpoint
CREATE TYPE "public"."storage_location" AS ENUM('TC 1', 'TC 2', 'TC 3');--> statement-breakpoint
CREATE TYPE "public"."warehouse_item_status" AS ENUM('tersedia', 'sedang_digunakan', 'habis');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('instrumen', 'peralatan');--> statement-breakpoint
CREATE TYPE "public"."calibration_status" AS ENUM('sudah_dijadwalkan', 'belum_dijadwalkan');--> statement-breakpoint
CREATE TYPE "public"."instrument_status" AS ENUM('terkalibrasi', 'jadwal_mendatang', 'lewat_jatuh_tempo', 'dalam_perbaikan');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('completed', 'scheduled', 'pending');--> statement-breakpoint
CREATE TYPE "public"."maintenance_type" AS ENUM('corrective', 'preventive', 'inspection');--> statement-breakpoint
CREATE TYPE "public"."schedule_event_type" AS ENUM('calibration', 'maintenance', 'expired', 'order');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"role" "user_role" DEFAULT 'analyst' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "items_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand" varchar(255),
	"category" "item_category" NOT NULL,
	"stock_unit" "stock_unit" NOT NULL,
	"minimum_stock_level" integer DEFAULT 0 NOT NULL,
	"location" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit" varchar(50),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"order_date" date NOT NULL,
	"ordered_by" uuid NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "reagent_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reagent_name" varchar(255) NOT NULL,
	"cas_number" varchar(50),
	"supplier" varchar(255),
	"storage_location" "storage_location" NOT NULL,
	"form" "item_form" NOT NULL,
	"msds_document" text,
	"product_photo" text,
	"minimum_stock_level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standard_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"standard_name" varchar(255) NOT NULL,
	"cas_number" varchar(50),
	"chemical_formula" varchar(100),
	"supplier" varchar(255),
	"size_value" numeric(10, 2),
	"size_unit" varchar(20),
	"form" "item_form" NOT NULL,
	"storage_location" "storage_location" NOT NULL,
	"msds_document" text,
	"photo" text,
	"minimum_stock_level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_set_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_set_id" uuid NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "training_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_name" varchar(255) NOT NULL,
	"participants_per_set" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"user_id" uuid NOT NULL,
	"usage_item" varchar(255) NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"quantity_used" numeric(10, 2) NOT NULL,
	"unit" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_chemicals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_id" uuid NOT NULL,
	"catalog_type" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"received_date" date NOT NULL,
	"size_value" numeric(10, 2) NOT NULL,
	"size_unit" varchar(20) NOT NULL,
	"remaining_amount" numeric(10, 2) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"expired_date" date NOT NULL,
	"received_by" uuid,
	"order_detail_id" uuid,
	"status" "warehouse_item_status" DEFAULT 'tersedia' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"specification" text,
	"lot_no" varchar(100),
	"category" "item_category" NOT NULL,
	"current_quantity" integer NOT NULL,
	"unit" "stock_unit" NOT NULL,
	"received_date" date NOT NULL,
	"received_by" uuid,
	"order_detail_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calibration_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performed_date" date NOT NULL,
	"instrument_id" uuid NOT NULL,
	"calibrator_name" varchar(255) NOT NULL,
	"calibrator_phone" varchar(50),
	"job_report_document" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand" varchar(255),
	"model" varchar(255),
	"calibration_vendor" varchar(255),
	"calibration_interval" integer DEFAULT 12,
	"last_calibration_date" date,
	"next_calibration_date" date,
	"pic" uuid,
	"status" "instrument_status" DEFAULT 'terkalibrasi' NOT NULL,
	"schedule_status" "calibration_status" DEFAULT 'belum_dijadwalkan' NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"location" "storage_location" NOT NULL,
	"photo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performed_by" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"maintenance_type" "maintenance_type" NOT NULL,
	"issue_description" text,
	"maintenance_actions" text,
	"maintenance_photo" text,
	"maintenance_date" date NOT NULL,
	"status" "maintenance_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"date" date NOT NULL,
	"type" "schedule_event_type" NOT NULL,
	"instrument_id" uuid,
	"location" varchar(255),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_ordered_by_profiles_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_set_items" ADD CONSTRAINT "training_set_items_training_set_id_training_sets_id_fk" FOREIGN KEY ("training_set_id") REFERENCES "public"."training_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_chemicals" ADD CONSTRAINT "warehouse_chemicals_received_by_profiles_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_items" ADD CONSTRAINT "warehouse_items_catalog_id_items_catalog_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."items_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_items" ADD CONSTRAINT "warehouse_items_received_by_profiles_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calibration_logs" ADD CONSTRAINT "calibration_logs_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_pic_profiles_id_fk" FOREIGN KEY ("pic") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_performed_by_profiles_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;