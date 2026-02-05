import { db, schema } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';
import type { SampleCatalog, NewSampleCatalog, WarehouseChemical } from '@/lib/db/schema/inventory';

export interface SampleWithStock extends SampleCatalog {
    currentStock: number;
    nearestExpDate: Date | null;
    status: 'available' | 'low_stock' | 'out_of_stock' | 'expired';
}

export interface SampleFilters {
    search?: string;
    status?: string;
    location?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedSamplesResult {
    data: SampleWithStock[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

class SampleService {
    /**
     * Get all samples with calculated stock (paginated)
     */
    async getAll(filters?: SampleFilters): Promise<PaginatedSamplesResult> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;

        // Get all sample catalogs
        const samples = await db.query.sampleCatalog.findMany({
            orderBy: desc(schema.sampleCatalog.createdAt),
        });

        // For each sample, calculate stock and status
        const samplesWithStock: SampleWithStock[] = await Promise.all(
            samples.map(async (sample) => {
                // Get warehouse items for this sample
                const warehouseItems = await db.query.warehouseChemicals.findMany({
                    where: and(
                        eq(schema.warehouseChemicals.catalogId, sample.id),
                        eq(schema.warehouseChemicals.catalogType, 'sample')
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
                let status: SampleWithStock['status'];
                if (expiredItems.length > 0 && validItems.length === 0) {
                    status = 'expired';
                } else if (currentStock === 0) {
                    status = 'out_of_stock';
                } else if (currentStock <= sample.minimumStockLevel) {
                    status = 'low_stock';
                } else {
                    status = 'available';
                }

                return {
                    ...sample,
                    currentStock,
                    nearestExpDate,
                    status,
                };
            })
        );

        // Apply filters
        let filteredSamples = samplesWithStock;

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filteredSamples = filteredSamples.filter(
                s => s.sampleName.toLowerCase().includes(searchLower) ||
                    s.matrix?.toLowerCase().includes(searchLower)
            );
        }

        if (filters?.status && filters.status !== 'all') {
            filteredSamples = filteredSamples.filter(s => s.status === filters.status);
        }

        if (filters?.location && filters.location !== 'all') {
            filteredSamples = filteredSamples.filter(s => s.storageLocation === filters.location);
        }

        // Calculate pagination
        const total = filteredSamples.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedSamples = filteredSamples.slice(offset, offset + limit);

        return {
            data: paginatedSamples,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get sample by ID with stock info
     */
    async getById(id: string): Promise<SampleWithStock | null> {
        const sample = await db.query.sampleCatalog.findFirst({
            where: eq(schema.sampleCatalog.id, id),
        });

        if (!sample) return null;

        // Calculate stock (same logic as getAll)
        const warehouseItems = await db.query.warehouseChemicals.findMany({
            where: and(
                eq(schema.warehouseChemicals.catalogId, sample.id),
                eq(schema.warehouseChemicals.catalogType, 'sample')
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

        let status: SampleWithStock['status'];
        if (expiredItems.length > 0 && validItems.length === 0) {
            status = 'expired';
        } else if (currentStock === 0) {
            status = 'out_of_stock';
        } else if (currentStock <= sample.minimumStockLevel) {
            status = 'low_stock';
        } else {
            status = 'available';
        }

        return {
            ...sample,
            currentStock,
            nearestExpDate,
            status,
        };
    }

    /**
     * Create new sample catalog entry
     */
    async create(data: NewSampleCatalog): Promise<SampleCatalog> {
        const [sample] = await db.insert(schema.sampleCatalog).values(data).returning();
        return sample;
    }

    /**
     * Update sample catalog entry
     */
    async update(id: string, data: Partial<NewSampleCatalog>): Promise<SampleCatalog | null> {
        const [sample] = await db
            .update(schema.sampleCatalog)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.sampleCatalog.id, id))
            .returning();
        return sample || null;
    }

    /**
     * Delete sample catalog entry and associated warehouse records
     */
    async delete(id: string): Promise<boolean> {
        // First delete associated warehouse records to prevent orphaned data
        await db
            .delete(schema.warehouseChemicals)
            .where(and(
                eq(schema.warehouseChemicals.catalogId, id),
                eq(schema.warehouseChemicals.catalogType, 'sample')
            ));

        // Then delete the catalog entry
        await db
            .delete(schema.sampleCatalog)
            .where(eq(schema.sampleCatalog.id, id));
        return true;
    }

    /**
     * Get warehouse items for a sample
     */
    async getWarehouseItems(catalogId: string): Promise<WarehouseChemical[]> {
        const items = await db.query.warehouseChemicals.findMany({
            where: and(
                eq(schema.warehouseChemicals.catalogId, catalogId),
                eq(schema.warehouseChemicals.catalogType, 'sample')
            ),
            orderBy: desc(schema.warehouseChemicals.expiredDate),
        });
        return items;
    }
}

export const sampleService = new SampleService();
