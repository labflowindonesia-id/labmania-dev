import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import type { WarehouseChemical, NewWarehouseChemical } from '@/lib/db/schema/inventory';

export interface WarehouseChemicalWithUser extends WarehouseChemical {
    receivedByUser?: { fullName: string } | null;
}

export interface CreateWarehouseChemicalInput {
    catalogId: string;
    catalogType: 'reagent' | 'standard';
    name: string;
    receivedDate: string;
    sizeValue: string;
    sizeUnit: string;
    remainingAmount: string;
    unit: string;
    expiredDate: string;
    receivedBy?: string;
    receivedByName?: string; // For static values like GAP/KEP/Manager
    status?: 'tersedia' | 'sedang_digunakan' | 'habis';
}

export interface WarehouseChemicalFilters {
    search?: string;
    status?: string;
    catalogType?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedWarehouseChemicalsResult {
    data: WarehouseChemicalWithUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

class WarehouseChemicalService {
    /**
     * Get all warehouse chemicals with optional status filter (paginated)
     */
    async getAll(filters?: WarehouseChemicalFilters): Promise<PaginatedWarehouseChemicalsResult> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;

        const chemicals = await db.query.warehouseChemicals.findMany({
            orderBy: desc(schema.warehouseChemicals.createdAt),
            with: {
                receivedByUser: true,
            },
        });

        let filtered = chemicals as WarehouseChemicalWithUser[];

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(c => c.name.toLowerCase().includes(searchLower));
        }

        if (filters?.status && filters.status !== 'all') {
            filtered = filtered.filter(c => c.status === filters.status);
        }

        if (filters?.catalogType && filters.catalogType !== 'all') {
            filtered = filtered.filter(c => c.catalogType === filters.catalogType);
        }

        // Calculate pagination
        const total = filtered.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedChemicals = filtered.slice(offset, offset + limit);

        return {
            data: paginatedChemicals,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get warehouse chemical by ID
     */
    async getById(id: string): Promise<WarehouseChemicalWithUser | null> {
        const chemical = await db.query.warehouseChemicals.findFirst({
            where: eq(schema.warehouseChemicals.id, id),
            with: {
                receivedByUser: true,
            },
        });
        return chemical as WarehouseChemicalWithUser | null;
    }

    /**
     * Create new warehouse chemical
     */
    async create(data: CreateWarehouseChemicalInput): Promise<WarehouseChemical> {
        const [chemical] = await db.insert(schema.warehouseChemicals).values({
            catalogId: data.catalogId,
            catalogType: data.catalogType,
            name: data.name,
            receivedDate: data.receivedDate,
            sizeValue: data.sizeValue,
            sizeUnit: data.sizeUnit,
            remainingAmount: data.remainingAmount,
            unit: data.unit,
            expiredDate: data.expiredDate,
            receivedBy: data.receivedBy,
            receivedByName: data.receivedByName,
            status: data.status || 'tersedia',
        }).returning();

        return chemical;
    }

    /**
     * Update warehouse chemical
     */
    async update(id: string, data: Partial<CreateWarehouseChemicalInput>): Promise<WarehouseChemical | null> {
        const [chemical] = await db
            .update(schema.warehouseChemicals)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(schema.warehouseChemicals.id, id))
            .returning();
        return chemical || null;
    }

    /**
     * Delete warehouse chemical
     */
    async delete(id: string): Promise<boolean> {
        await db.delete(schema.warehouseChemicals).where(eq(schema.warehouseChemicals.id, id));
        return true;
    }
}

export const warehouseChemicalService = new WarehouseChemicalService();
