import { pgTable, uuid, varchar, text, integer, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { profiles } from './users';
import { storageLocationEnum } from './inventory';

// Enums
export const instrumentStatusEnum = pgEnum('instrument_status', ['terkalibrasi', 'jadwal_mendatang', 'lewat_jatuh_tempo', 'dalam_perbaikan']);
export const calibrationStatusEnum = pgEnum('calibration_status', ['sudah_dijadwalkan', 'belum_dijadwalkan']);
export const assetTypeEnum = pgEnum('asset_type', ['instrumen', 'peralatan']);
export const maintenanceTypeEnum = pgEnum('maintenance_type', ['corrective', 'preventive', 'inspection']);
export const maintenanceStatusEnum = pgEnum('maintenance_status', ['completed', 'scheduled', 'pending']);
export const scheduleEventTypeEnum = pgEnum('schedule_event_type', ['calibration', 'maintenance', 'expired', 'order']);

// Instruments
export const instruments = pgTable('instruments', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    brand: varchar('brand', { length: 255 }),
    model: varchar('model', { length: 255 }),
    serialNumber: varchar('serial_number', { length: 255 }),
    assetNumber: varchar('asset_number', { length: 255 }),
    purchaseDate: date('purchase_date'),
    description: text('description'),
    calibrationVendor: varchar('calibration_vendor', { length: 255 }),
    calibrationVendorPhone: varchar('calibration_vendor_phone', { length: 50 }),
    calibrationInterval: integer('calibration_interval').default(12), // months
    lastCalibrationDate: date('last_calibration_date'),
    nextCalibrationDate: date('next_calibration_date'),
    pic: uuid('pic').references(() => profiles.id),
    picName: varchar('pic_name', { length: 100 }), // For storing text like 'KEP', 'GEP'
    status: instrumentStatusEnum('status').default('terkalibrasi').notNull(),
    scheduleStatus: calibrationStatusEnum('schedule_status').default('belum_dijadwalkan').notNull(),
    assetType: assetTypeEnum('asset_type').notNull(),
    location: storageLocationEnum('location').notNull(),
    photo: text('photo'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Calibration Logs
export const calibrationLogs = pgTable('calibration_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    performedDate: date('performed_date').notNull(),
    instrumentId: uuid('instrument_id').references(() => instruments.id, { onDelete: 'cascade' }).notNull(),
    calibratorName: varchar('calibrator_name', { length: 255 }).notNull(),
    calibratorPhone: varchar('calibrator_phone', { length: 50 }),
    jobReportDocument: text('job_report_document'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Maintenance Logs
export const maintenanceLogs = pgTable('maintenance_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    performedBy: uuid('performed_by').references(() => profiles.id).notNull(),
    instrumentId: uuid('instrument_id').references(() => instruments.id, { onDelete: 'cascade' }).notNull(),
    maintenanceType: maintenanceTypeEnum('maintenance_type').notNull(),
    issueDescription: text('issue_description'),
    maintenanceActions: text('maintenance_actions'),
    maintenancePhoto: text('maintenance_photo'),
    maintenanceDate: date('maintenance_date').notNull(),
    status: maintenanceStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Schedule Events (for calendar)
export const scheduleEvents = pgTable('schedule_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    date: date('date').notNull(),
    type: scheduleEventTypeEnum('type').notNull(),
    instrumentId: uuid('instrument_id').references(() => instruments.id),
    location: varchar('location', { length: 255 }),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const instrumentsRelations = relations(instruments, ({ one, many }) => ({
    picUser: one(profiles, { fields: [instruments.pic], references: [profiles.id] }),
    calibrationLogs: many(calibrationLogs),
    maintenanceLogs: many(maintenanceLogs),
    scheduleEvents: many(scheduleEvents),
}));

export const calibrationLogsRelations = relations(calibrationLogs, ({ one }) => ({
    instrument: one(instruments, { fields: [calibrationLogs.instrumentId], references: [instruments.id] }),
}));

export const maintenanceLogsRelations = relations(maintenanceLogs, ({ one }) => ({
    instrument: one(instruments, { fields: [maintenanceLogs.instrumentId], references: [instruments.id] }),
    performedByUser: one(profiles, { fields: [maintenanceLogs.performedBy], references: [profiles.id] }),
}));

export const scheduleEventsRelations = relations(scheduleEvents, ({ one }) => ({
    instrument: one(instruments, { fields: [scheduleEvents.instrumentId], references: [instruments.id] }),
}));

// Type exports
export type Instrument = typeof instruments.$inferSelect;
export type NewInstrument = typeof instruments.$inferInsert;
export type CalibrationLog = typeof calibrationLogs.$inferSelect;
export type NewCalibrationLog = typeof calibrationLogs.$inferInsert;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type NewMaintenanceLog = typeof maintenanceLogs.$inferInsert;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
export type NewScheduleEvent = typeof scheduleEvents.$inferInsert;
