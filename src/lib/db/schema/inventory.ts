import { pgTable, uuid, varchar, text, integer, decimal, timestamp, date, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { profiles } from './users';

// Enums
export const stockStatusEnum = pgEnum('stock_status', ['available', 'low_stock', 'out_of_stock', 'expired']);
export const itemFormEnum = pgEnum('item_form', ['solid', 'liquid', 'gas']);
export const storageLocationEnum = pgEnum('storage_location', ['TC 1', 'TC 2', 'TC 3']);
export const stockUnitEnum = pgEnum('stock_unit', ['unit', 'pack', 'pcs', 'set', 'roll', 'ml', 'L', 'g', 'kg']);
export const itemCategoryEnum = pgEnum('item_category', ['barang', 'consumable']);
export const warehouseItemStatusEnum = pgEnum('warehouse_item_status', ['tersedia', 'sedang_digunakan', 'habis']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'approved', 'rejected', 'received', 'cancelled']);

// Reagent Catalog
export const reagentCatalog = pgTable('reagent_catalog', {
    id: uuid('id').primaryKey().defaultRandom(),
    reagentName: varchar('reagent_name', { length: 255 }).notNull(),
    casNumber: varchar('cas_number', { length: 50 }),
    supplier: varchar('supplier', { length: 255 }),
    storageLocation: storageLocationEnum('storage_location').notNull(),
    form: itemFormEnum('form').notNull(),
    msdsDocument: text('msds_document'), // Storage URL
    productPhoto: text('product_photo'), // Storage URL
    minimumStockLevel: integer('minimum_stock_level').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Standard Stock Catalog
export const standardCatalog = pgTable('standard_catalog', {
    id: uuid('id').primaryKey().defaultRandom(),
    standardName: varchar('standard_name', { length: 255 }).notNull(),
    casNumber: varchar('cas_number', { length: 50 }),
    chemicalFormula: varchar('chemical_formula', { length: 100 }),
    supplier: varchar('supplier', { length: 255 }),
    sizeValue: decimal('size_value', { precision: 10, scale: 2 }),
    sizeUnit: varchar('size_unit', { length: 20 }),
    form: itemFormEnum('form').notNull(),
    storageLocation: storageLocationEnum('storage_location').notNull(),
    msdsDocument: text('msds_document'),
    photo: text('photo'),
    minimumStockLevel: integer('minimum_stock_level').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Items & Consumables Catalog
export const itemsCatalog = pgTable('items_catalog', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    brand: varchar('brand', { length: 255 }),
    category: itemCategoryEnum('category').notNull(),
    stockUnit: stockUnitEnum('stock_unit').notNull(),
    minimumStockLevel: integer('minimum_stock_level').default(0).notNull(),
    location: varchar('location', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const warehouseChemicals = pgTable('warehouse_chemicals', {
    id: uuid('id').primaryKey().defaultRandom(),
    catalogId: uuid('catalog_id').notNull(),
    catalogType: varchar('catalog_type', { length: 20 }).notNull(), // 'reagent' | 'standard'
    name: varchar('name', { length: 255 }).notNull(),
    receivedDate: date('received_date').notNull(),
    sizeValue: decimal('size_value', { precision: 10, scale: 2 }).notNull(),
    sizeUnit: varchar('size_unit', { length: 20 }).notNull(),
    remainingAmount: decimal('remaining_amount', { precision: 10, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 20 }).notNull(),
    expiredDate: date('expired_date').notNull(),
    receivedBy: uuid('received_by').references(() => profiles.id),
    receivedByName: varchar('received_by_name', { length: 100 }), // Text field for GAP/KEP/Manager
    orderDetailId: uuid('order_detail_id'),
    status: warehouseItemStatusEnum('status').default('tersedia').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Warehouse Items
export const warehouseItems = pgTable('warehouse_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    catalogId: uuid('catalog_id').references(() => itemsCatalog.id).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    specification: text('specification'),
    lotNo: varchar('lot_no', { length: 100 }),
    category: itemCategoryEnum('category').notNull(),
    currentQuantity: integer('current_quantity').notNull(),
    unit: stockUnitEnum('unit').notNull(),
    receivedDate: date('received_date').notNull(),
    receivedBy: uuid('received_by').references(() => profiles.id),
    receivedByName: varchar('received_by_name', { length: 100 }), // Text field for GAP/KEP/Manager
    orderDetailId: uuid('order_detail_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Orders
export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: varchar('order_number', { length: 50 }).unique().notNull(),
    orderDate: date('order_date').notNull(),
    orderedBy: uuid('ordered_by').references(() => profiles.id).notNull(),
    status: orderStatusEnum('status').default('pending').notNull(),
    approvedBy: uuid('approved_by').references(() => profiles.id),
    approvedDate: timestamp('approved_date'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Order Items (freeform text as requested)
export const orderItems = pgTable('order_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
    itemName: varchar('item_name', { length: 255 }).notNull(),
    quantity: integer('quantity').notNull(),
    unit: varchar('unit', { length: 50 }),
    notes: text('notes'),
});

// Usage Logs
export const usageLogs = pgTable('usage_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date').notNull(),
    userId: uuid('user_id').references(() => profiles.id).notNull(),
    usageItem: varchar('usage_item', { length: 255 }).notNull(),
    itemType: varchar('item_type', { length: 50 }).notNull(), // 'barang' | 'consumable' | 'reagent' | 'standard'
    quantityUsed: decimal('quantity_used', { precision: 10, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 50 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Training Sets
export const trainingSets = pgTable('training_sets', {
    id: uuid('id').primaryKey().defaultRandom(),
    trainingName: varchar('training_name', { length: 255 }).notNull(),
    participantsPerSet: integer('participants_per_set').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Training Set Items
export const trainingSetItems = pgTable('training_set_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    trainingSetId: uuid('training_set_id').references(() => trainingSets.id, { onDelete: 'cascade' }).notNull(),
    itemType: varchar('item_type', { length: 50 }).notNull(), // 'equipment' | 'consumable' | 'reagent_standard'
    itemName: varchar('item_name', { length: 255 }).notNull(),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 50 }),
});

// Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
    orderedByUser: one(profiles, { fields: [orders.orderedBy], references: [profiles.id] }),
    approvedByUser: one(profiles, { fields: [orders.approvedBy], references: [profiles.id] }),
    items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const trainingSetRelations = relations(trainingSets, ({ many }) => ({
    items: many(trainingSetItems),
}));

export const trainingSetItemsRelations = relations(trainingSetItems, ({ one }) => ({
    trainingSet: one(trainingSets, { fields: [trainingSetItems.trainingSetId], references: [trainingSets.id] }),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
    user: one(profiles, { fields: [usageLogs.userId], references: [profiles.id] }),
}));

export const warehouseChemicalsRelations = relations(warehouseChemicals, ({ one }) => ({
    receivedByUser: one(profiles, { fields: [warehouseChemicals.receivedBy], references: [profiles.id] }),
}));

export const warehouseItemsRelations = relations(warehouseItems, ({ one }) => ({
    catalog: one(itemsCatalog, { fields: [warehouseItems.catalogId], references: [itemsCatalog.id] }),
    receivedByUser: one(profiles, { fields: [warehouseItems.receivedBy], references: [profiles.id] }),
}));

// Type exports
export type ReagentCatalog = typeof reagentCatalog.$inferSelect;
export type NewReagentCatalog = typeof reagentCatalog.$inferInsert;
export type StandardCatalog = typeof standardCatalog.$inferSelect;
export type NewStandardCatalog = typeof standardCatalog.$inferInsert;
export type ItemsCatalog = typeof itemsCatalog.$inferSelect;
export type NewItemsCatalog = typeof itemsCatalog.$inferInsert;
export type WarehouseChemical = typeof warehouseChemicals.$inferSelect;
export type NewWarehouseChemical = typeof warehouseChemicals.$inferInsert;
export type WarehouseItem = typeof warehouseItems.$inferSelect;
export type NewWarehouseItem = typeof warehouseItems.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;
export type TrainingSet = typeof trainingSets.$inferSelect;
export type NewTrainingSet = typeof trainingSets.$inferInsert;
export type TrainingSetItem = typeof trainingSetItems.$inferSelect;
export type NewTrainingSetItem = typeof trainingSetItems.$inferInsert;
