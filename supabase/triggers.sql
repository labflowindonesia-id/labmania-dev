-- Database Triggers for Labmania LIMS
-- Run this in Supabase SQL Editor

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- INSTRUMENT STATUS TRIGGER
-- =============================================
-- Automatically update instrument status based on calibration dates

CREATE OR REPLACE FUNCTION update_instrument_status()
RETURNS TRIGGER AS $$
DECLARE
    days_until_due INTEGER;
BEGIN
    -- Skip if status is manually set to 'dalam_perbaikan'
    IF NEW.status = 'dalam_perbaikan' THEN
        RETURN NEW;
    END IF;

    -- Calculate days until next calibration
    IF NEW.next_calibration_date IS NOT NULL THEN
        days_until_due := NEW.next_calibration_date - CURRENT_DATE;
        
        IF days_until_due < 0 THEN
            NEW.status := 'lewat_jatuh_tempo';
        ELSIF days_until_due <= 30 THEN
            NEW.status := 'jadwal_mendatang';
        ELSE
            NEW.status := 'terkalibrasi';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- APPLY TRIGGERS
-- =============================================

-- Updated_at triggers for all relevant tables
CREATE TRIGGER update_instruments_updated_at
    BEFORE UPDATE ON instruments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_logs_updated_at
    BEFORE UPDATE ON maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouse_chemicals_updated_at
    BEFORE UPDATE ON warehouse_chemicals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouse_items_updated_at
    BEFORE UPDATE ON warehouse_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_sets_updated_at
    BEFORE UPDATE ON training_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_events_updated_at
    BEFORE UPDATE ON schedule_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Instrument status trigger (on calibration date changes)
CREATE TRIGGER update_instrument_status_trigger
    BEFORE INSERT OR UPDATE OF next_calibration_date ON instruments
    FOR EACH ROW
    EXECUTE FUNCTION update_instrument_status();

-- =============================================
-- CALIBRATION LOG TRIGGER
-- =============================================
-- When a calibration log is added, update the instrument's dates

CREATE OR REPLACE FUNCTION update_instrument_on_calibration()
RETURNS TRIGGER AS $$
DECLARE
    inst_interval INTEGER;
    next_date DATE;
BEGIN
    -- Get instrument's calibration interval
    SELECT calibration_interval INTO inst_interval
    FROM instruments
    WHERE id = NEW.instrument_id;

    -- Calculate next calibration date (default 12 months if not set)
    next_date := NEW.performed_date + (COALESCE(inst_interval, 12) * INTERVAL '1 month');

    -- Update the instrument
    UPDATE instruments
    SET 
        last_calibration_date = NEW.performed_date,
        next_calibration_date = next_date,
        status = 'terkalibrasi',
        schedule_status = 'sudah_dijadwalkan',
        updated_at = NOW()
    WHERE id = NEW.instrument_id;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calibration_log_update_instrument
    AFTER INSERT ON calibration_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_instrument_on_calibration();

-- =============================================
-- DAILY STATUS CHECK (Optional - run via cron)
-- =============================================
-- This function can be scheduled to run daily to update all instrument statuses

CREATE OR REPLACE FUNCTION check_all_instrument_statuses()
RETURNS void AS $$
BEGIN
    UPDATE instruments
    SET status = 
        CASE 
            WHEN status = 'dalam_perbaikan' THEN 'dalam_perbaikan'
            WHEN next_calibration_date IS NULL THEN status
            WHEN next_calibration_date - CURRENT_DATE < 0 THEN 'lewat_jatuh_tempo'
            WHEN next_calibration_date - CURRENT_DATE <= 30 THEN 'jadwal_mendatang'
            ELSE 'terkalibrasi'
        END,
        updated_at = NOW()
    WHERE status != 'dalam_perbaikan';
END;
$$ language 'plpgsql';

-- Schedule daily check (requires pg_cron extension)
-- SELECT cron.schedule('check-instrument-status', '0 0 * * *', 'SELECT check_all_instrument_statuses()');
