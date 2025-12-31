-- Migration: Add missing columns to instruments table
-- Run this SQL in Supabase SQL Editor

-- Add serial_number column
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255);

-- Add asset_number column
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS asset_number VARCHAR(255);

-- Add purchase_date column
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS purchase_date DATE;

-- Add description column
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS description TEXT;

-- Add calibration_vendor_phone column
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS calibration_vendor_phone VARCHAR(50);

-- Add pic_name column for storing text like 'KEP', 'GEP'
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS pic_name VARCHAR(100);
