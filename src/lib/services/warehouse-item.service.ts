import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import type { WarehouseItem, NewWarehouseItem } from '@/lib/db/schema/inventory';

export interface WarehouseItemWithUser extends WarehouseItem {
    receivedByUser?: { fullName: string } | null;
    catalog?: { name: string } | null;
}

export interface CreateWarehouseItemInput {
    catalogId: string;
    name: string;
    specification?: string;
    lotNo?: string;
    category: 'barang' | 'consumable';
    currentQuantity: number;
    unit: 'unit' | 'pack' | 'pcs' | 'set' | 'roll' | 'ml' | 'L' | 'g' | 'kg';
    receivedDate: string;
    receivedBy?: string;
    receivedByName?: string; // For static values like GAP/KEP/Manager
}

class WarehouseItemService {
    /**
     * Get all warehouse items with optional category filter
     */
    async getAll(category?: string): Promise<WarehouseItemWithUser[]> {
        const items = await db.query.warehouseItems.findMany({
            orderBy: desc(schema.warehouseItems.createdAt),
            with: {
                receivedByUser: true,
                catalog: true,
            },
        });

        let filtered = items;
        if (category && category !== 'all') {
            filtered = items.filter(item => item.category === category);
        }

        return filtered as WarehouseItemWithUser[];
    }

    /**
     * Get warehouse item by ID
     */
    async getById(id: string): Promise<WarehouseItemWithUser | null> {
        const item = await db.query.warehouseItems.findFirst({
            where: eq(schema.warehouseItems.id, id),
            with: {
                receivedByUser: true,
                catalog: true,
            },
        });
        return item as WarehouseItemWithUser | null;
    }

    /**
     * Create new warehouse item (Terima Barang Baru)
     */
    async create(data: CreateWarehouseItemInput): Promise<WarehouseItem> {
        const [item] = await db.insert(schema.warehouseItems).values({
            catalogId: data.catalogId,
            name: data.name,
            specification: data.specification,
            lotNo: data.lotNo,
            category: data.category,
            currentQuantity: data.currentQuantity,
            unit: data.unit,
            receivedDate: data.receivedDate,
            receivedBy: data.receivedBy,
            receivedByName: data.receivedByName,
        }).returning();

        return item;
    }

    /**
     * Update warehouse item
     */
    async update(id: string, data: Partial<CreateWarehouseItemInput>): Promise<WarehouseItem | null> {
        const [item] = await db
            .update(schema.warehouseItems)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(schema.warehouseItems.id, id))
            .returning();
        return item || null;
    }

    /**
     * Delete warehouse item
     */
    async delete(id: string): Promise<boolean> {
        await db.delete(schema.warehouseItems).where(eq(schema.warehouseItems.id, id));
        return true;
    }
}

export const warehouseItemService = new WarehouseItemService();
