import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import type { WarehouseItem } from '@/lib/db/schema/inventory';

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
    unitCost?: number | null;
    receivedDate: string;
    receivedBy?: string;
    receivedByName?: string; // For static values like GAP/KEP/Manager
}

export interface WarehouseItemFilters {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedWarehouseItemsResult {
    data: WarehouseItemWithUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

class WarehouseItemService {
    /**
     * Get all warehouse items with optional category filter (paginated)
     */
    async getAll(filters?: WarehouseItemFilters): Promise<PaginatedWarehouseItemsResult> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;

        const items = await db.query.warehouseItems.findMany({
            orderBy: desc(schema.warehouseItems.createdAt),
            with: {
                receivedByUser: true,
                catalog: true,
            },
        });

        let filtered = items as WarehouseItemWithUser[];

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchLower) ||
                (item.lotNo && item.lotNo.toLowerCase().includes(searchLower))
            );
        }

        if (filters?.category && filters.category !== 'all') {
            filtered = filtered.filter(item => item.category === filters.category);
        }

        // Calculate pagination
        const total = filtered.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedItems = filtered.slice(offset, offset + limit);

        return {
            data: paginatedItems,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
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
            unitCost: data.unitCost ? String(data.unitCost) : null,
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
        // Convert unitCost from number to string if present
        const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
        if (data.unitCost !== undefined) {
            updateData.unitCost = data.unitCost ? String(data.unitCost) : null;
        }

        const [item] = await db
            .update(schema.warehouseItems)
            .set(updateData)
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
