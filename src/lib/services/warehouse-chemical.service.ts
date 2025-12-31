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

class WarehouseChemicalService {
    /**
     * Get all warehouse chemicals with optional status filter
     */
    async getAll(status?: string): Promise<WarehouseChemicalWithUser[]> {
        const chemicals = await db.query.warehouseChemicals.findMany({
            orderBy: desc(schema.warehouseChemicals.createdAt),
            with: {
                receivedByUser: true,
            },
        });

        let filtered = chemicals;
        if (status && status !== 'all') {
            filtered = chemicals.filter(c => c.status === status);
        }

        return filtered as WarehouseChemicalWithUser[];
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
