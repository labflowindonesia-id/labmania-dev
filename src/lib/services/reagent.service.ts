import { db, schema } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';
import type { ReagentCatalog, NewReagentCatalog, WarehouseChemical } from '@/lib/db/schema/inventory';

export interface ReagentWithStock extends ReagentCatalog {
    currentStock: number;
    nearestExpDate: Date | null;
    status: 'available' | 'low_stock' | 'out_of_stock' | 'expired';
}

export interface ReagentFilters {
    search?: string;
    status?: string;
    location?: string;
    sortBy?: 'fefo' | 'name' | 'stock';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface PaginatedReagentsResult {
    data: ReagentWithStock[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

class ReagentService {
    /**
     * Get all reagents with calculated stock (paginated)
     */
    async getAll(filters?: ReagentFilters): Promise<PaginatedReagentsResult> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;

        // Get all reagent catalogs
        const reagents = await db.query.reagentCatalog.findMany({
            orderBy: desc(schema.reagentCatalog.createdAt),
        });

        // For each reagent, calculate stock and status
        const reagentsWithStock: ReagentWithStock[] = await Promise.all(
            reagents.map(async (reagent) => {
                // Get warehouse items for this reagent
                const warehouseItems = await db.query.warehouseChemicals.findMany({
                    where: and(
                        eq(schema.warehouseChemicals.catalogId, reagent.id),
                        eq(schema.warehouseChemicals.catalogType, 'reagent')
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
                let status: ReagentWithStock['status'];
                if (expiredItems.length > 0 && validItems.length === 0) {
                    status = 'expired';
                } else if (currentStock === 0) {
                    status = 'out_of_stock';
                } else if (currentStock <= reagent.minimumStockLevel) {
                    status = 'low_stock';
                } else {
                    status = 'available';
                }

                return {
                    ...reagent,
                    currentStock,
                    nearestExpDate,
                    status,
                };
            })
        );

        // Apply filters
        let filteredReagents = reagentsWithStock;

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filteredReagents = filteredReagents.filter(
                r => r.reagentName.toLowerCase().includes(searchLower) ||
                    r.casNumber?.toLowerCase().includes(searchLower)
            );
        }

        if (filters?.status && filters.status !== 'all') {
            filteredReagents = filteredReagents.filter(r => r.status === filters.status);
        }

        if (filters?.location && filters.location !== 'all') {
            filteredReagents = filteredReagents.filter(r => r.storageLocation === filters.location);
        }

        // Apply sorting (before pagination for scalability with >500 items)
        const sortBy = filters?.sortBy || 'fefo';
        const sortOrder = filters?.sortOrder || 'asc';

        filteredReagents.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'fefo':
                    // Sort by nearest expiry date first (FEFO = First Expired First Out)
                    const aDate = a.nearestExpDate ? new Date(a.nearestExpDate).getTime() : Infinity;
                    const bDate = b.nearestExpDate ? new Date(b.nearestExpDate).getTime() : Infinity;
                    comparison = aDate - bDate;
                    break;
                case 'name':
                    // Sort alphabetically by name
                    comparison = a.reagentName.localeCompare(b.reagentName, 'id');
                    break;
                case 'stock':
                    // Sort by lowest stock first
                    comparison = a.currentStock - b.currentStock;
                    break;
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });

        // Calculate pagination
        const total = filteredReagents.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedReagents = filteredReagents.slice(offset, offset + limit);

        return {
            data: paginatedReagents,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get reagent by ID with stock info
     */
    async getById(id: string): Promise<ReagentWithStock | null> {
        const reagent = await db.query.reagentCatalog.findFirst({
            where: eq(schema.reagentCatalog.id, id),
        });

        if (!reagent) return null;

        // Calculate stock (same logic as getAll)
        const warehouseItems = await db.query.warehouseChemicals.findMany({
            where: and(
                eq(schema.warehouseChemicals.catalogId, reagent.id),
                eq(schema.warehouseChemicals.catalogType, 'reagent')
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

        let status: ReagentWithStock['status'];
        if (expiredItems.length > 0 && validItems.length === 0) {
            status = 'expired';
        } else if (currentStock === 0) {
            status = 'out_of_stock';
        } else if (currentStock <= reagent.minimumStockLevel) {
            status = 'low_stock';
        } else {
            status = 'available';
        }

        return {
            ...reagent,
            currentStock,
            nearestExpDate,
            status,
        };
    }

    /**
     * Create new reagent catalog entry
     */
    async create(data: NewReagentCatalog): Promise<ReagentCatalog> {
        const [reagent] = await db.insert(schema.reagentCatalog).values(data).returning();
        return reagent;
    }

    /**
     * Update reagent catalog entry
     */
    async update(id: string, data: Partial<NewReagentCatalog>): Promise<ReagentCatalog | null> {
        const [reagent] = await db
            .update(schema.reagentCatalog)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.reagentCatalog.id, id))
            .returning();
        return reagent || null;
    }

    /**
     * Delete reagent catalog entry and associated warehouse records
     */
    async delete(id: string): Promise<boolean> {
        // First delete associated warehouse records to prevent orphaned data
        await db
            .delete(schema.warehouseChemicals)
            .where(and(
                eq(schema.warehouseChemicals.catalogId, id),
                eq(schema.warehouseChemicals.catalogType, 'reagent')
            ));

        // Then delete the catalog entry
        await db
            .delete(schema.reagentCatalog)
            .where(eq(schema.reagentCatalog.id, id));
        return true;
    }

    /**
     * Get warehouse items for a reagent
     */
    async getWarehouseItems(catalogId: string): Promise<WarehouseChemical[]> {
        const items = await db.query.warehouseChemicals.findMany({
            where: and(
                eq(schema.warehouseChemicals.catalogId, catalogId),
                eq(schema.warehouseChemicals.catalogType, 'reagent')
            ),
            orderBy: desc(schema.warehouseChemicals.expiredDate),
        });
        return items;
    }
}

export const reagentService = new ReagentService();
