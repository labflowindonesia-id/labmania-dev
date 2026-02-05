import { pgTable, uuid, varchar, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { profiles } from './users';

// Notification type enum
export const notificationTypeEnum = pgEnum('notification_type', [
    'calibration_h30',
    'expired_h30',
    'maintenance_reminder',
    'calibration_scheduled'
]);

// Reference type enum
export const notificationReferenceTypeEnum = pgEnum('notification_reference_type', [
    'instrument',
    'chemical'
]);

// Notifications table
export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    referenceId: uuid('reference_id').notNull(),
    referenceType: notificationReferenceTypeEnum('reference_type').notNull(),
    actionUrl: varchar('action_url', { length: 500 }),
    isRead: boolean('is_read').default(false).notNull(),
    webhookSent: boolean('webhook_sent').default(false).notNull(),
    dueDate: timestamp('due_date'), // The actual due date for calibration/expiry
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const notificationsRelations = relations(notifications, ({ }) => ({}));

// Type exports
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
