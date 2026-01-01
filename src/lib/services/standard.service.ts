import { db, schema } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';
import type { StandardCatalog, NewStandardCatalog, WarehouseChemical } from '@/lib/db/schema/inventory';

export interface StandardWithStock extends StandardCatalog {
    currentStock: number;
    nearestExpDate: Date | null;
    status: 'available' | 'low_stock' | 'out_of_stock' | 'expired';
    productPhoto?: string | null; // Frontend compatibility alias for photo
}

export interface StandardFilters {
    search?: string;
    status?: string;
    location?: string;
}

class StandardService {
    /**
     * Get all standards with calculated stock
     */
    async getAll(filters?: StandardFilters): Promise<StandardWithStock[]> {
        const standards = await db.query.standardCatalog.findMany({
            orderBy: desc(schema.standardCatalog.createdAt),
        });

        // For each standard, calculate stock and status
        const standardsWithStock: StandardWithStock[] = await Promise.all(
            standards.map(async (standard) => {
                // Get warehouse items for this standard
                const warehouseItems = await db.query.warehouseChemicals.findMany({
                    where: and(
                        eq(schema.warehouseChemicals.catalogId, standard.id),
                        eq(schema.warehouseChemicals.catalogType, 'standard')
                    ),
                });

                // Calculate total stock (count of non-expired items)
                const today = new Date();
                const validItems = warehouseItems.filter(item => new Date(item.expiredDate) > today);
                const expiredItems = warehouseItems.filter(item => new Date(item.expiredDate) <= today);

                const currentStock = validItems.length;

                // Find nearest expiry date
                const nearestExpDate = validItems.length > 0
                    ? validItems.reduce((nearest, item) => {
                        const itemDate = new Date(item.expiredDate);
                        return itemDate < nearest ? itemDate : nearest;
                    }, new Date(validItems[0].expiredDate))
                    : null;

                // Determine status
                let status: StandardWithStock['status'];
                if (expiredItems.length > 0 && validItems.length === 0) {
                    status = 'expired';
                } else if (currentStock === 0) {
                    status = 'out_of_stock';
                } else if (currentStock <= standard.minimumStockLevel) {
                    status = 'low_stock';
                } else {
                    status = 'available';
                }

                return {
                    ...standard,
                    productPhoto: standard.photo, // Map for frontend compatibility
                    currentStock,
                    nearestExpDate,
                    status,
                };
            })
        );

        // Apply filters
        let filteredStandards = standardsWithStock;

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filteredStandards = filteredStandards.filter(
                s => s.standardName.toLowerCase().includes(searchLower) ||
                    s.casNumber?.toLowerCase().includes(searchLower) ||
                    s.chemicalFormula?.toLowerCase().includes(searchLower)
            );
        }

        if (filters?.status && filters.status !== 'all') {
            filteredStandards = filteredStandards.filter(s => s.status === filters.status);
        }

        if (filters?.location && filters.location !== 'all') {
            filteredStandards = filteredStandards.filter(s => s.storageLocation === filters.location);
        }

        return filteredStandards;
    }

    /**
     * Get standard by ID with stock info
     */
    async getById(id: string): Promise<StandardWithStock | null> {
        const standard = await db.query.standardCatalog.findFirst({
            where: eq(schema.standardCatalog.id, id),
        });

        if (!standard) return null;

        // Calculate stock
        const warehouseItems = await db.query.warehouseChemicals.findMany({
            where: and(
                eq(schema.warehouseChemicals.catalogId, standard.id),
                eq(schema.warehouseChemicals.catalogType, 'standard')
            ),
        });

        const today = new Date();
        const validItems = warehouseItems.filter(item => new Date(item.expiredDate) > today);
        const expiredItems = warehouseItems.filter(item => new Date(item.expiredDate) <= today);

        const currentStock = validItems.length;

        const nearestExpDate = validItems.length > 0
            ? validItems.reduce((nearest, item) => {
                const itemDate = new Date(item.expiredDate);
                return itemDate < nearest ? itemDate : nearest;
            }, new Date(validItems[0].expiredDate))
            : null;

        let status: StandardWithStock['status'];
        if (expiredItems.length > 0 && validItems.length === 0) {
            status = 'expired';
        } else if (currentStock === 0) {
            status = 'out_of_stock';
        } else if (currentStock <= standard.minimumStockLevel) {
            status = 'low_stock';
        } else {
            status = 'available';
        }

        return {
            ...standard,
            productPhoto: standard.photo, // Map for frontend compatibility
            currentStock,
            nearestExpDate,
            status,
        };
    }

    /**
     * Create new standard catalog entry
     */
    async create(data: NewStandardCatalog): Promise<StandardCatalog> {
        const [standard] = await db.insert(schema.standardCatalog).values(data).returning();
        return standard;
    }

    /**
     * Update standard catalog entry
     */
    async update(id: string, data: Partial<NewStandardCatalog>): Promise<StandardCatalog | null> {
        const [standard] = await db
            .update(schema.standardCatalog)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.standardCatalog.id, id))
            .returning();
        return standard || null;
    }

    /**
     * Delete standard catalog entry and associated warehouse records
     */
    async delete(id: string): Promise<boolean> {
        // First delete associated warehouse records to prevent orphaned data appearing in dashboard
        await db
            .delete(schema.warehouseChemicals)
            .where(and(
                eq(schema.warehouseChemicals.catalogId, id),
                eq(schema.warehouseChemicals.catalogType, 'standard')
            ));

        // Then delete the catalog entry
        await db
            .delete(schema.standardCatalog)
            .where(eq(schema.standardCatalog.id, id));
        return true;
    }

    /**
     * Get warehouse items for a standard
     */
    async getWarehouseItems(catalogId: string): Promise<WarehouseChemical[]> {
        const items = await db.query.warehouseChemicals.findMany({
            where: and(
                eq(schema.warehouseChemicals.catalogId, catalogId),
                eq(schema.warehouseChemicals.catalogType, 'standard')
            ),
            orderBy: desc(schema.warehouseChemicals.expiredDate),
        });
        return items;
    }
}

export const standardService = new StandardService();
