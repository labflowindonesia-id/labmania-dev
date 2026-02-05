-- Create sample_catalog table for QC Samples
CREATE TABLE IF NOT EXISTS sample_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_name VARCHAR(255) NOT NULL,
    matrix VARCHAR(100),
    storage_location storage_location NOT NULL,
    form item_form NOT NULL,
    photo TEXT,
    minimum_stock_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sample_catalog_name ON sample_catalog(sample_name);
CREATE INDEX IF NOT EXISTS idx_sample_catalog_storage ON sample_catalog(storage_location);

-- Add RLS policy
ALTER TABLE sample_catalog ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (adjust as needed)
CREATE POLICY "sample_catalog_policy" ON sample_catalog
    FOR ALL
    USING (true)
    WITH CHECK (true);
