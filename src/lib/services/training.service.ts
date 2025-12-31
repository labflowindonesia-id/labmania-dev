import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import type {
    TrainingSet,
    NewTrainingSet,
    TrainingSetItem,
    NewTrainingSetItem
} from '@/lib/db/schema/inventory';

export interface TrainingSetWithItems extends TrainingSet {
    items: TrainingSetItem[];
}

export interface CreateTrainingSetData {
    trainingName: string;
    participantsPerSet: number;
    items: Omit<NewTrainingSetItem, 'id' | 'trainingSetId'>[];
}

export interface StockCheckResult {
    item: string;
    type: string;
    required: number;
    available: number;
    unit: string;
    status: 'available' | 'insufficient' | 'not_found';
}

class TrainingService {
    /**
     * Get all training sets with items
     */
    async getAll(): Promise<TrainingSetWithItems[]> {
        const trainingSets = await db.query.trainingSets.findMany({
            orderBy: desc(schema.trainingSets.createdAt),
            with: {
                items: true,
            },
        });

        return trainingSets as TrainingSetWithItems[];
    }

    /**
     * Get training set by ID with items
     */
    async getById(id: string): Promise<TrainingSetWithItems | null> {
        const trainingSet = await db.query.trainingSets.findFirst({
            where: eq(schema.trainingSets.id, id),
            with: {
                items: true,
            },
        });

        return trainingSet as TrainingSetWithItems | null;
    }

    /**
     * Create new training set with items
     */
    async create(data: CreateTrainingSetData): Promise<TrainingSetWithItems> {
        // Create the training set
        const [trainingSet] = await db.insert(schema.trainingSets).values({
            trainingName: data.trainingName,
            participantsPerSet: data.participantsPerSet,
        }).returning();

        // Create the items
        if (data.items.length > 0) {
            await db.insert(schema.trainingSetItems).values(
                data.items.map(item => ({
                    ...item,
                    trainingSetId: trainingSet.id,
                }))
            );
        }

        // Return with items
        return this.getById(trainingSet.id) as Promise<TrainingSetWithItems>;
    }

    /**
     * Update training set and items
     */
    async update(id: string, data: Partial<CreateTrainingSetData>): Promise<TrainingSetWithItems | null> {
        // Update training set
        const updateData: Partial<NewTrainingSet> = {};
        if (data.trainingName) updateData.trainingName = data.trainingName;
        if (data.participantsPerSet) updateData.participantsPerSet = data.participantsPerSet;

        if (Object.keys(updateData).length > 0) {
            await db
                .update(schema.trainingSets)
                .set({ ...updateData, updatedAt: new Date() })
                .where(eq(schema.trainingSets.id, id));
        }

        // If items are provided, replace all items
        if (data.items) {
            // Delete existing items
            await db.delete(schema.trainingSetItems)
                .where(eq(schema.trainingSetItems.trainingSetId, id));

            // Insert new items
            if (data.items.length > 0) {
                await db.insert(schema.trainingSetItems).values(
                    data.items.map(item => ({
                        ...item,
                        trainingSetId: id,
                    }))
                );
            }
        }

        return this.getById(id);
    }

    /**
     * Delete training set (cascade deletes items)
     */
    async delete(id: string): Promise<boolean> {
        await db.delete(schema.trainingSets)
            .where(eq(schema.trainingSets.id, id));
        return true;
    }

    /**
     * Check stock availability for training
     */
    async checkStock(id: string, participants: number): Promise<StockCheckResult[]> {
        const trainingSet = await this.getById(id);
        if (!trainingSet) return [];

        const results: StockCheckResult[] = [];
        const multiplier = Math.ceil(participants / trainingSet.participantsPerSet);

        for (const item of trainingSet.items) {
            const required = Number(item.quantity) * multiplier;
            let available = 0;
            let status: StockCheckResult['status'] = 'not_found';

            // Check based on item type
            if (item.itemType === 'equipment' || item.itemType === 'barang' || item.itemType === 'consumable') {
                // Check warehouse_items - match by exact name
                const warehouseItems = await db.query.warehouseItems.findMany();
                const matchingItems = warehouseItems.filter(
                    wi => wi.name.toLowerCase() === item.itemName.toLowerCase()
                );

                if (matchingItems.length > 0) {
                    available = matchingItems.reduce((sum, wi) => sum + wi.currentQuantity, 0);
                    status = available >= required ? 'available' : 'insufficient';
                }
            } else if (item.itemType === 'reagent_standard' || item.itemType === 'reagent' || item.itemType === 'standard') {
                // Check warehouse_chemicals - match by exact name
                const chemicals = await db.query.warehouseChemicals.findMany();
                const matchingChemicals = chemicals.filter(
                    c => c.name.toLowerCase() === item.itemName.toLowerCase()
                );

                if (matchingChemicals.length > 0) {
                    available = matchingChemicals.reduce(
                        (sum, c) => sum + Number(c.remainingAmount), 0
                    );
                    status = available >= required ? 'available' : 'insufficient';
                }
            }

            results.push({
                item: item.itemName,
                type: item.itemType,
                required,
                available,
                unit: item.unit || 'unit',
                status,
            });
        }

        return results;
    }

    /**
     * Process training - reduce stock for consumables/reagents, just monitor for equipment
     * Rule: barang (equipment) = pantau saja, consumable/reagent_standard = kurangi stok
     */
    async processTraining(id: string, participants: number, userId: string): Promise<{
        success: boolean;
        message: string;
        processed: { item: string; type: string; action: 'monitored' | 'reduced'; quantity: number }[];
    }> {
        const trainingSet = await this.getById(id);
        if (!trainingSet) {
            return { success: false, message: 'Training set tidak ditemukan', processed: [] };
        }

        const multiplier = Math.ceil(participants / trainingSet.participantsPerSet);
        const processed: { item: string; type: string; action: 'monitored' | 'reduced'; quantity: number }[] = [];

        for (const item of trainingSet.items) {
            const required = Number(item.quantity) * multiplier;

            if (item.itemType === 'equipment' || item.itemType === 'barang') {
                // Barang: Hanya pantau, tidak dikurangi
                processed.push({
                    item: item.itemName,
                    type: item.itemType,
                    action: 'monitored',
                    quantity: required,
                });
            } else if (item.itemType === 'consumable') {
                // Consumable: Kurangi stok dari warehouse_items
                const warehouseItems = await db.query.warehouseItems.findMany();
                const matchingItems = warehouseItems.filter(
                    wi => wi.name.toLowerCase() === item.itemName.toLowerCase()
                );

                let remaining = required;
                for (const wi of matchingItems) {
                    if (remaining <= 0) break;
                    const reduceAmount = Math.min(remaining, wi.currentQuantity);
                    if (reduceAmount > 0) {
                        await db.update(schema.warehouseItems)
                            .set({ currentQuantity: wi.currentQuantity - reduceAmount })
                            .where(eq(schema.warehouseItems.id, wi.id));
                        remaining -= reduceAmount;
                    }
                }

                // Log to usage logs
                await db.insert(schema.usageLogs).values({
                    date: new Date().toISOString().split('T')[0],
                    userId: userId,
                    usageItem: item.itemName,
                    itemType: 'consumable',
                    quantityUsed: String(required),
                    unit: item.unit || 'pcs',
                    notes: `Penggunaan untuk ${trainingSet.trainingName}`,
                });

                processed.push({
                    item: item.itemName,
                    type: 'consumable',
                    action: 'reduced',
                    quantity: required,
                });
            } else if (item.itemType === 'reagent_standard' || item.itemType === 'reagent' || item.itemType === 'standard') {
                // Reagent/Standard: Kurangi stok dari warehouse_chemicals
                const chemicals = await db.query.warehouseChemicals.findMany();
                const matchingChemicals = chemicals.filter(
                    c => c.name.toLowerCase() === item.itemName.toLowerCase()
                );

                let remaining = required;
                for (const chem of matchingChemicals) {
                    if (remaining <= 0) break;
                    const reduceAmount = Math.min(remaining, Number(chem.remainingAmount));
                    if (reduceAmount > 0) {
                        await db.update(schema.warehouseChemicals)
                            .set({ remainingAmount: String(Number(chem.remainingAmount) - reduceAmount) })
                            .where(eq(schema.warehouseChemicals.id, chem.id));
                        remaining -= reduceAmount;
                    }
                }

                // Log to usage logs
                await db.insert(schema.usageLogs).values({
                    date: new Date().toISOString().split('T')[0],
                    userId: userId,
                    usageItem: item.itemName,
                    itemType: item.itemType === 'standard' ? 'standard' : 'reagent',
                    quantityUsed: String(required),
                    unit: item.unit || 'ml',
                    notes: `Penggunaan untuk ${trainingSet.trainingName}`,
                });

                processed.push({
                    item: item.itemName,
                    type: item.itemType,
                    action: 'reduced',
                    quantity: required,
                });
            }
        }

        return {
            success: true,
            message: `Training berhasil diproses untuk ${participants} peserta`,
            processed,
        };
    }
}

export const trainingService = new TrainingService();
