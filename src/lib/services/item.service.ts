import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import type { ItemsCatalog, NewItemsCatalog, WarehouseItem } from '@/lib/db/schema/inventory';

export interface ItemWithStock extends ItemsCatalog {
    currentQuantity: number;
    status: 'available' | 'low_stock' | 'out_of_stock';
}

export interface ItemFilters {
    search?: string;
    category?: string;
    status?: string;
}

class ItemService {
    /**
     * Get all items with calculated stock
     */
    async getAll(filters?: ItemFilters): Promise<ItemWithStock[]> {
        const items = await db.query.itemsCatalog.findMany({
            orderBy: desc(schema.itemsCatalog.createdAt),
        });

        // For each item, calculate stock
        const itemsWithStock: ItemWithStock[] = await Promise.all(
            items.map(async (item) => {
                // Get warehouse items for this catalog item
                const warehouseItems = await db.query.warehouseItems.findMany({
                    where: eq(schema.warehouseItems.catalogId, item.id),
                });

                // Calculate total quantity
                const currentQuantity = warehouseItems.reduce(
                    (sum, wi) => sum + wi.currentQuantity, 0
                );

                // Determine status
                let status: ItemWithStock['status'];
                if (currentQuantity === 0) {
                    status = 'out_of_stock';
                } else if (currentQuantity <= item.minimumStockLevel) {
                    status = 'low_stock';
                } else {
                    status = 'available';
                }

                return {
                    ...item,
                    currentQuantity,
                    status,
                };
            })
        );

        // Apply filters
        let filteredItems = itemsWithStock;

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filteredItems = filteredItems.filter(
                i => i.name.toLowerCase().includes(searchLower) ||
                    i.brand?.toLowerCase().includes(searchLower)
            );
        }

        if (filters?.category && filters.category !== 'all') {
            filteredItems = filteredItems.filter(i => i.category === filters.category);
        }

        if (filters?.status && filters.status !== 'all') {
            filteredItems = filteredItems.filter(i => i.status === filters.status);
        }

        return filteredItems;
    }

    /**
     * Get item by ID with stock info
     */
    async getById(id: string): Promise<ItemWithStock | null> {
        const item = await db.query.itemsCatalog.findFirst({
            where: eq(schema.itemsCatalog.id, id),
        });

        if (!item) return null;

        // Get warehouse items
        const warehouseItems = await db.query.warehouseItems.findMany({
            where: eq(schema.warehouseItems.catalogId, item.id),
        });

        const currentQuantity = warehouseItems.reduce(
            (sum, wi) => sum + wi.currentQuantity, 0
        );

        let status: ItemWithStock['status'];
        if (currentQuantity === 0) {
            status = 'out_of_stock';
        } else if (currentQuantity <= item.minimumStockLevel) {
            status = 'low_stock';
        } else {
            status = 'available';
        }

        return {
            ...item,
            currentQuantity,
            status,
        };
    }

    /**
     * Create new item catalog entry
     */
    async create(data: NewItemsCatalog): Promise<ItemsCatalog> {
        const [item] = await db.insert(schema.itemsCatalog).values(data).returning();
        return item;
    }

    /**
     * Update item catalog entry
     */
    async update(id: string, data: Partial<NewItemsCatalog>): Promise<ItemsCatalog | null> {
        const [item] = await db
            .update(schema.itemsCatalog)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.itemsCatalog.id, id))
            .returning();
        return item || null;
    }

    /**
     * Delete item catalog entry and associated warehouse records
     */
    async delete(id: string): Promise<boolean> {
        // First delete associated warehouse records to prevent orphaned data
        await db
            .delete(schema.warehouseItems)
            .where(eq(schema.warehouseItems.catalogId, id));

        // Then delete the catalog entry
        await db
            .delete(schema.itemsCatalog)
            .where(eq(schema.itemsCatalog.id, id));
        return true;
    }

    /**
     * Get warehouse items for a catalog item
     */
    async getWarehouseItems(catalogId: string): Promise<WarehouseItem[]> {
        const items = await db.query.warehouseItems.findMany({
            where: eq(schema.warehouseItems.catalogId, catalogId),
            orderBy: desc(schema.warehouseItems.receivedDate),
        });
        return items;
    }
}

export const itemService = new ItemService();
