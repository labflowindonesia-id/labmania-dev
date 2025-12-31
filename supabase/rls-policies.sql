-- Row Level Security (RLS) Policies for Labmania LIMS
-- Run this in Supabase SQL Editor after migrations

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reagent_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_set_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- =============================================
-- All authenticated users can read profiles
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Admin only can insert/update/delete profiles
CREATE POLICY "Admin can manage profiles" ON profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- INVENTORY CATALOG POLICIES (Read all, Write for authenticated)
-- =============================================
-- Reagent Catalog
CREATE POLICY "Authenticated users can read reagent_catalog" ON reagent_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage reagent_catalog" ON reagent_catalog
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Standard Catalog
CREATE POLICY "Authenticated users can read standard_catalog" ON standard_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage standard_catalog" ON standard_catalog
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Items Catalog
CREATE POLICY "Authenticated users can read items_catalog" ON items_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage items_catalog" ON items_catalog
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- WAREHOUSE POLICIES
-- =============================================
CREATE POLICY "Authenticated users can read warehouse_chemicals" ON warehouse_chemicals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage warehouse_chemicals" ON warehouse_chemicals
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read warehouse_items" ON warehouse_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage warehouse_items" ON warehouse_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- ORDERS POLICIES
-- =============================================
CREATE POLICY "Authenticated users can read orders" ON orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only manager/admin can update orders (for approval)
CREATE POLICY "Manager/Admin can update orders" ON orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- Order Items
CREATE POLICY "Authenticated users can read order_items" ON order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage order_items" ON order_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- USAGE LOGS POLICIES
-- =============================================
CREATE POLICY "Authenticated users can read usage_logs" ON usage_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage usage_logs" ON usage_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- TRAINING SETS POLICIES
-- =============================================
CREATE POLICY "Authenticated users can read training_sets" ON training_sets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage training_sets" ON training_sets
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read training_set_items" ON training_set_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage training_set_items" ON training_set_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- INSTRUMENTS POLICIES
-- =============================================
CREATE POLICY "Authenticated users can read instruments" ON instruments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage instruments" ON instruments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read calibration_logs" ON calibration_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage calibration_logs" ON calibration_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read maintenance_logs" ON maintenance_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage maintenance_logs" ON maintenance_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- SCHEDULE EVENTS POLICIES
-- =============================================
CREATE POLICY "Authenticated users can read schedule_events" ON schedule_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage schedule_events" ON schedule_events
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
