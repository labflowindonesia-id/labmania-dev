# Row Level Security (RLS) Policies

## Overview

Labmania LIMS uses Supabase Row Level Security (RLS) to enforce data access at the database level. All authenticated users have read access to most data, while write operations are controlled per table.

---

## Tables with RLS Enabled

| Table | Read | Insert | Update | Delete |
|-------|------|--------|--------|--------|
| `profiles` | All authenticated | Admin only | Admin only | Admin only |
| `reagent_catalog` | All authenticated | All authenticated | All authenticated | All authenticated |
| `standard_catalog` | All authenticated | All authenticated | All authenticated | All authenticated |
| `items_catalog` | All authenticated | All authenticated | All authenticated | All authenticated |
| `warehouse_chemicals` | All authenticated | All authenticated | All authenticated | All authenticated |
| `warehouse_items` | All authenticated | All authenticated | All authenticated | All authenticated |
| `orders` | All authenticated | All authenticated | Manager/Admin | - |
| `order_items` | All authenticated | All authenticated | All authenticated | All authenticated |
| `usage_logs` | All authenticated | All authenticated | All authenticated | All authenticated |
| `training_sets` | All authenticated | All authenticated | All authenticated | All authenticated |
| `training_set_items` | All authenticated | All authenticated | All authenticated | All authenticated |
| `instruments` | All authenticated | All authenticated | All authenticated | All authenticated |
| `calibration_logs` | All authenticated | All authenticated | All authenticated | All authenticated |
| `maintenance_logs` | All authenticated | All authenticated | All authenticated | All authenticated |
| `schedule_events` | All authenticated | All authenticated | All authenticated | All authenticated |

---

## Policy Details

### Profiles Table

```sql
-- All authenticated users can read
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Allow anon to read for login flow (username lookup before auth)
CREATE POLICY "Allow anon to read profiles for login" ON profiles
  FOR SELECT TO anon USING (true);

-- Admin only for write operations
CREATE POLICY "Admin can manage profiles" ON profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

> **Note**: The anon read policy is safe because profiles only contain non-sensitive data (username, display name, role).

### Orders Table (Special Case)

Orders have special restrictions for approval workflow:

```sql
-- Anyone can read
CREATE POLICY "Authenticated users can read orders" ON orders
  FOR SELECT TO authenticated USING (true);

-- Anyone can create
CREATE POLICY "Authenticated users can create orders" ON orders
  FOR INSERT TO authenticated WITH CHECK (true);

-- Only Manager/Admin can update (for approval)
CREATE POLICY "Manager/Admin can update orders" ON orders
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin')));
```

---

## Storage Bucket Policies

| Bucket | Public Read | Authenticated Upload | Delete |
|--------|-------------|---------------------|--------|
| `images` | ✅ Public | ✅ Authenticated | Admin only |
| `documents` | ❌ Private | ✅ Authenticated | Admin only |
| `calibration-reports` | ❌ Private | ✅ Authenticated | Admin only |
| `maintenance-photos` | ❌ Private | ✅ Authenticated | Admin only |

### Bucket Configuration

| Bucket | Max Size | Allowed Types |
|--------|----------|---------------|
| `images` | 5 MB | JPEG, PNG, WebP, GIF |
| `documents` | 10 MB | PDF, DOC, DOCX |
| `calibration-reports` | 10 MB | PDF only |
| `maintenance-photos` | 5 MB | JPEG, PNG, WebP |

---

## Database Triggers

### Auto-Update Triggers

These triggers automatically update `updated_at` timestamp:

- `update_instruments_updated_at`
- `update_maintenance_logs_updated_at`
- `update_warehouse_chemicals_updated_at`
- `update_warehouse_items_updated_at`
- `update_orders_updated_at`
- `update_training_sets_updated_at`
- `update_schedule_events_updated_at`

### Instrument Status Trigger

Automatically updates instrument status based on calibration dates:

| Condition | Status |
|-----------|--------|
| `next_calibration_date` < today | `lewat_jatuh_tempo` |
| `next_calibration_date` within 30 days | `jadwal_mendatang` |
| Otherwise | `terkalibrasi` |

### Calibration Log Trigger

When a new calibration log is added, the trigger:
1. Updates `last_calibration_date` on the instrument
2. Calculates `next_calibration_date` based on interval
3. Sets status to `terkalibrasi`

---

## SQL Files Location

All SQL configurations are in `/supabase/`:

```
supabase/
├── rls-policies.sql      # RLS policy definitions
├── storage-config.sql    # Storage bucket configuration
└── triggers.sql          # Database triggers
```

Run these files in Supabase SQL Editor after migrations.
