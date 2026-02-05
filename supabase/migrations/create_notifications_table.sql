-- Create notification type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('calibration_h30', 'expired_h30', 'maintenance_reminder', 'calibration_scheduled');
    END IF;
END$$;

-- Create notification reference type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_reference_type') THEN
        CREATE TYPE notification_reference_type AS ENUM ('instrument', 'chemical');
    END IF;
END$$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reference_id UUID NOT NULL,
    reference_type notification_reference_type NOT NULL,
    action_url VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT false,
    webhook_sent BOOLEAN NOT NULL DEFAULT false,
    due_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON notifications(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Add RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read notifications
CREATE POLICY "Allow read notifications" ON notifications
    FOR SELECT
    USING (true);

-- Allow all authenticated users to update notifications (mark as read)
CREATE POLICY "Allow update notifications" ON notifications
    FOR UPDATE
    USING (true);

-- Allow service role to insert notifications
CREATE POLICY "Allow insert notifications" ON notifications
    FOR INSERT
    WITH CHECK (true);

-- Allow service role to delete notifications
CREATE POLICY "Allow delete notifications" ON notifications
    FOR DELETE
    USING (true);
