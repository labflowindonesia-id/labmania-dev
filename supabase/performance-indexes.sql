-- =====================================================
-- Labmania Database Performance Indexes
-- Purpose: Speed up dashboard and inventory queries
-- Safe to run multiple times (IF NOT EXISTS)
-- =====================================================

-- =====================================================
-- REAGENT CATALOG INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reagent_catalog_id ON reagent_catalog(id);
CREATE INDEX IF NOT EXISTS idx_reagent_catalog_minimum_stock ON reagent_catalog(minimum_stock_level);

-- =====================================================
-- STANDARD CATALOG INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_standard_catalog_id ON standard_catalog(id);
CREATE INDEX IF NOT EXISTS idx_standard_catalog_minimum_stock ON standard_catalog(minimum_stock_level);

-- =====================================================
-- ITEMS CATALOG INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_items_catalog_id ON items_catalog(id);
CREATE INDEX IF NOT EXISTS idx_items_catalog_category ON items_catalog(category);
CREATE INDEX IF NOT EXISTS idx_items_catalog_minimum_stock ON items_catalog(minimum_stock_level);

-- =====================================================
-- WAREHOUSE CHEMICALS INDEXES (Most important for dashboard)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_warehouse_chemicals_catalog ON warehouse_chemicals(catalog_id, catalog_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_chemicals_status ON warehouse_chemicals(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_chemicals_expired_date ON warehouse_chemicals(expired_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_chemicals_catalog_status ON warehouse_chemicals(catalog_id, catalog_type, status);

-- =====================================================
-- WAREHOUSE ITEMS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_warehouse_items_catalog_id ON warehouse_items(catalog_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_category ON warehouse_items(category);

-- =====================================================
-- INSTRUMENTS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_instruments_status ON instruments(status);
CREATE INDEX IF NOT EXISTS idx_instruments_next_calibration ON instruments(next_calibration_date);
CREATE INDEX IF NOT EXISTS idx_instruments_location ON instruments(location);

-- =====================================================
-- ORDERS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- =====================================================
-- USAGE LOGS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON usage_logs(date);
CREATE INDEX IF NOT EXISTS idx_usage_logs_item_type ON usage_logs(item_type);

-- =====================================================
-- MAINTENANCE LOGS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_date ON maintenance_logs(maintenance_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_instrument ON maintenance_logs(instrument_id);

-- =====================================================
-- CALIBRATION LOGS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_calibration_logs_instrument ON calibration_logs(instrument_id);
CREATE INDEX IF NOT EXISTS idx_calibration_logs_date ON calibration_logs(performed_date);

-- =====================================================
-- PROFILES INDEX (for auth performance)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- =====================================================
-- VERIFY INDEXES CREATED
-- =====================================================
-- Run this query to see all indexes:
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;
