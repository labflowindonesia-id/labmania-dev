import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import type {
    TrainingSet,
    NewTrainingSet,
    TrainingSetItem,
    NewTrainingSetItem,
} from '@/lib/db/schema/inventory';
import { costService } from './cost.service';

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
    // Cost tracking fields
    unitCost: number | null;
    estimatedCost: number | null;
    warehouseId: string | null;
}

export interface ProcessedItemResult {
    item: string;
    type: string;
    action: 'monitored' | 'reduced';
    quantity: number;
    unitCost: number;
    totalCost: number;
    warehouseId: string | null;
}

export interface ProcessTrainingResult {
    success: boolean;
    message: string;
    processed: ProcessedItemResult[];
    costLogId: string | null;
    totalCost: number;
}

export interface TrainingFilters {
    search?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedTrainingsResult {
    data: TrainingSetWithItems[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}


class TrainingService {
    /**
     * Get all training sets with items (paginated)
     */
    async getAll(filters?: TrainingFilters): Promise<PaginatedTrainingsResult> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;

        const trainingSets = await db.query.trainingSets.findMany({
            orderBy: desc(schema.trainingSets.createdAt),
            with: {
                items: true,
            },
        });

        let filtered = trainingSets as TrainingSetWithItems[];

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(ts =>
                ts.trainingName.toLowerCase().includes(searchLower)
            );
        }

        // Calculate pagination
        const total = filtered.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedTrainings = filtered.slice(offset, offset + limit);

        return {
            data: paginatedTrainings,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
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
     * Check stock availability for training with cost estimation
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
            let unitCost: number | null = null;
            let estimatedCost: number | null = null;
            let warehouseId: string | null = null;

            // Check based on item type
            if (item.itemType === 'equipment' || item.itemType === 'barang') {
                // Equipment: just monitor, no cost tracking
                const warehouseItems = await db.query.warehouseItems.findMany();
                const matchingItems = warehouseItems.filter(
                    wi => wi.name.toLowerCase() === item.itemName.toLowerCase()
                );

                if (matchingItems.length > 0) {
                    available = matchingItems.reduce((sum, wi) => sum + wi.currentQuantity, 0);
                    status = available >= required ? 'available' : 'insufficient';
                }
                // Equipment has no cost (just monitored)
                unitCost = 0;
                estimatedCost = 0;
            } else if (item.itemType === 'consumable') {
                // Check warehouse_items - match by exact name
                const warehouseItems = await db.query.warehouseItems.findMany({
                    orderBy: [schema.warehouseItems.receivedDate], // FIFO
                });
                const matchingItems = warehouseItems.filter(
                    wi => wi.name.toLowerCase() === item.itemName.toLowerCase()
                );

                if (matchingItems.length > 0) {
                    available = matchingItems.reduce((sum, wi) => sum + wi.currentQuantity, 0);
                    status = available >= required ? 'available' : 'insufficient';

                    // Get cost from first matching item with price (FIFO)
                    const itemWithCost = matchingItems.find(wi => wi.unitCost !== null);
                    if (itemWithCost && itemWithCost.unitCost) {
                        unitCost = Number(itemWithCost.unitCost);
                        estimatedCost = unitCost * required;
                        warehouseId = itemWithCost.id;
                    }
                }
            } else if (item.itemType === 'reagent_standard' || item.itemType === 'reagent' || item.itemType === 'standard') {
                // Check warehouse_chemicals - match by exact name
                const chemicals = await db.query.warehouseChemicals.findMany({
                    orderBy: [schema.warehouseChemicals.expiredDate], // FEFO
                });
                const matchingChemicals = chemicals.filter(
                    c => c.name.toLowerCase() === item.itemName.toLowerCase() &&
                        (c.catalogType === 'reagent' || c.catalogType === 'standard')
                );

                if (matchingChemicals.length > 0) {
                    available = matchingChemicals.reduce(
                        (sum, c) => sum + Number(c.remainingAmount), 0
                    );
                    status = available >= required ? 'available' : 'insufficient';

                    // Get cost from first matching chemical with price (FEFO)
                    const chemWithCost = matchingChemicals.find(c => c.unitCostBase !== null || c.totalPrice !== null);
                    if (chemWithCost) {
                        if (chemWithCost.unitCostBase) {
                            unitCost = Number(chemWithCost.unitCostBase);
                        } else if (chemWithCost.totalPrice && Number(chemWithCost.sizeValue) > 0) {
                            unitCost = Number(chemWithCost.totalPrice) / Number(chemWithCost.sizeValue);
                        }
                        if (unitCost) {
                            estimatedCost = unitCost * required;
                            warehouseId = chemWithCost.id;
                        }
                    }
                }
            } else if (item.itemType === 'sample') {
                // Check warehouse_chemicals for samples - match by exact name and catalogType='sample'
                const chemicals = await db.query.warehouseChemicals.findMany({
                    orderBy: [schema.warehouseChemicals.expiredDate], // FEFO
                });
                const matchingSamples = chemicals.filter(
                    c => c.name.toLowerCase() === item.itemName.toLowerCase() &&
                        c.catalogType === 'sample'
                );

                if (matchingSamples.length > 0) {
                    available = matchingSamples.reduce(
                        (sum, c) => sum + Number(c.remainingAmount), 0
                    );
                    status = available >= required ? 'available' : 'insufficient';

                    // Get cost from first matching sample with price (FEFO)
                    const sampleWithCost = matchingSamples.find(c => c.unitCostBase !== null || c.totalPrice !== null);
                    if (sampleWithCost) {
                        if (sampleWithCost.unitCostBase) {
                            unitCost = Number(sampleWithCost.unitCostBase);
                        } else if (sampleWithCost.totalPrice && Number(sampleWithCost.sizeValue) > 0) {
                            unitCost = Number(sampleWithCost.totalPrice) / Number(sampleWithCost.sizeValue);
                        }
                        if (unitCost) {
                            estimatedCost = unitCost * required;
                            warehouseId = sampleWithCost.id;
                        }
                    }
                }
            }

            results.push({
                item: item.itemName,
                type: item.itemType,
                required,
                available,
                unit: item.unit || 'unit',
                status,
                unitCost,
                estimatedCost,
                warehouseId,
            });
        }

        return results;
    }

    /**
     * Process training - reduce stock for consumables/reagents, just monitor for equipment
     * Rule: barang (equipment) = pantau saja, consumable/reagent_standard = kurangi stok
     * Now includes cost tracking with idempotency and full traceability
     */
    async processTraining(id: string, participants: number, userId: string, userName?: string): Promise<ProcessTrainingResult> {
        const trainingSet = await this.getById(id);
        if (!trainingSet) {
            return { success: false, message: 'Training set tidak ditemukan', processed: [], costLogId: null, totalCost: 0 };
        }

        // Generate idempotency key to prevent double execution
        const idempotencyKey = costService.generateIdempotencyKey(id, participants, userId);

        // Check for duplicate execution
        const isDuplicate = await costService.checkDuplicateExecution(idempotencyKey);
        if (isDuplicate) {
            return {
                success: false,
                message: 'Training sudah diproses sebelumnya. Cegah duplikasi eksekusi.',
                processed: [],
                costLogId: null,
                totalCost: 0
            };
        }

        const multiplier = Math.ceil(participants / trainingSet.participantsPerSet);
        const processed: ProcessedItemResult[] = [];
        let totalTrainingCost = 0;

        // Process each item
        for (const item of trainingSet.items) {
            const required = Number(item.quantity) * multiplier;
            let unitCost = 0;
            let itemTotalCost = 0;
            let warehouseId: string | null = null;

            if (item.itemType === 'equipment' || item.itemType === 'barang') {
                // Equipment: Just monitor, no stock reduction, no cost
                processed.push({
                    item: item.itemName,
                    type: item.itemType,
                    action: 'monitored',
                    quantity: required,
                    unitCost: 0,
                    totalCost: 0,
                    warehouseId: null,
                });
            } else if (item.itemType === 'consumable') {
                // Consumable: Reduce stock from warehouse_items with FIFO
                const warehouseItems = await db.query.warehouseItems.findMany({
                    orderBy: [schema.warehouseItems.receivedDate], // FIFO
                });
                const matchingItems = warehouseItems.filter(
                    wi => wi.name.toLowerCase() === item.itemName.toLowerCase()
                );

                let remaining = required;
                for (const wi of matchingItems) {
                    if (remaining <= 0) break;
                    const reduceAmount = Math.min(remaining, wi.currentQuantity);
                    if (reduceAmount > 0) {
                        // Get cost from this batch
                        if (wi.unitCost && warehouseId === null) {
                            unitCost = Number(wi.unitCost);
                            warehouseId = wi.id;
                        }

                        await db.update(schema.warehouseItems)
                            .set({ currentQuantity: wi.currentQuantity - reduceAmount })
                            .where(eq(schema.warehouseItems.id, wi.id));
                        remaining -= reduceAmount;
                    }
                }

                itemTotalCost = unitCost * required;
                totalTrainingCost += itemTotalCost;

                // Log to usage logs with cost
                await db.insert(schema.usageLogs).values({
                    date: new Date().toISOString().split('T')[0],
                    userId: userId,
                    usageItem: item.itemName,
                    itemType: 'consumable',
                    quantityUsed: String(required),
                    unit: item.unit || 'pcs',
                    unitCost: unitCost > 0 ? String(unitCost) : null,
                    totalCost: itemTotalCost > 0 ? String(itemTotalCost) : null,
                    warehouseItemId: warehouseId,
                    warehouseType: 'item',
                    notes: `Penggunaan untuk ${trainingSet.trainingName}`,
                });

                processed.push({
                    item: item.itemName,
                    type: 'consumable',
                    action: 'reduced',
                    quantity: required,
                    unitCost,
                    totalCost: itemTotalCost,
                    warehouseId,
                });
            } else if (item.itemType === 'reagent_standard' || item.itemType === 'reagent' || item.itemType === 'standard') {
                // Reagent/Standard: Reduce stock from warehouse_chemicals with FEFO
                const chemicals = await db.query.warehouseChemicals.findMany({
                    orderBy: [schema.warehouseChemicals.expiredDate], // FEFO
                });
                const matchingChemicals = chemicals.filter(
                    c => c.name.toLowerCase() === item.itemName.toLowerCase() &&
                        (c.catalogType === 'reagent' || c.catalogType === 'standard')
                );

                let remaining = required;
                for (const chem of matchingChemicals) {
                    if (remaining <= 0) break;
                    const reduceAmount = Math.min(remaining, Number(chem.remainingAmount));
                    if (reduceAmount > 0) {
                        // Get cost from this batch
                        if (warehouseId === null) {
                            if (chem.unitCostBase) {
                                unitCost = Number(chem.unitCostBase);
                            } else if (chem.totalPrice && Number(chem.sizeValue) > 0) {
                                unitCost = Number(chem.totalPrice) / Number(chem.sizeValue);
                            }
                            warehouseId = chem.id;
                        }

                        await db.update(schema.warehouseChemicals)
                            .set({ remainingAmount: String(Number(chem.remainingAmount) - reduceAmount) })
                            .where(eq(schema.warehouseChemicals.id, chem.id));
                        remaining -= reduceAmount;
                    }
                }

                itemTotalCost = unitCost * required;
                totalTrainingCost += itemTotalCost;

                // Log to usage logs with cost
                await db.insert(schema.usageLogs).values({
                    date: new Date().toISOString().split('T')[0],
                    userId: userId,
                    usageItem: item.itemName,
                    itemType: item.itemType === 'standard' ? 'standard' : 'reagent',
                    quantityUsed: String(required),
                    unit: item.unit || 'ml',
                    unitCost: unitCost > 0 ? String(unitCost) : null,
                    totalCost: itemTotalCost > 0 ? String(itemTotalCost) : null,
                    warehouseItemId: warehouseId,
                    warehouseType: 'chemical',
                    notes: `Penggunaan untuk ${trainingSet.trainingName}`,
                });

                processed.push({
                    item: item.itemName,
                    type: item.itemType,
                    action: 'reduced',
                    quantity: required,
                    unitCost,
                    totalCost: itemTotalCost,
                    warehouseId,
                });
            } else if (item.itemType === 'sample') {
                // Sample: Reduce stock from warehouse_chemicals with FEFO (filter by catalogType='sample')
                const chemicals = await db.query.warehouseChemicals.findMany({
                    orderBy: [schema.warehouseChemicals.expiredDate], // FEFO
                });
                const matchingSamples = chemicals.filter(
                    c => c.name.toLowerCase() === item.itemName.toLowerCase() &&
                        c.catalogType === 'sample'
                );

                let remaining = required;
                for (const sample of matchingSamples) {
                    if (remaining <= 0) break;
                    const reduceAmount = Math.min(remaining, Number(sample.remainingAmount));
                    if (reduceAmount > 0) {
                        // Get cost from this batch
                        if (warehouseId === null) {
                            if (sample.unitCostBase) {
                                unitCost = Number(sample.unitCostBase);
                            } else if (sample.totalPrice && Number(sample.sizeValue) > 0) {
                                unitCost = Number(sample.totalPrice) / Number(sample.sizeValue);
                            }
                            warehouseId = sample.id;
                        }

                        await db.update(schema.warehouseChemicals)
                            .set({ remainingAmount: String(Number(sample.remainingAmount) - reduceAmount) })
                            .where(eq(schema.warehouseChemicals.id, sample.id));
                        remaining -= reduceAmount;
                    }
                }

                itemTotalCost = unitCost * required;
                totalTrainingCost += itemTotalCost;

                // Log to usage logs with cost
                await db.insert(schema.usageLogs).values({
                    date: new Date().toISOString().split('T')[0],
                    userId: userId,
                    usageItem: item.itemName,
                    itemType: 'sample',
                    quantityUsed: String(required),
                    unit: item.unit || 'ml',
                    unitCost: unitCost > 0 ? String(unitCost) : null,
                    totalCost: itemTotalCost > 0 ? String(itemTotalCost) : null,
                    warehouseItemId: warehouseId,
                    warehouseType: 'chemical',
                    notes: `Penggunaan untuk ${trainingSet.trainingName}`,
                });

                processed.push({
                    item: item.itemName,
                    type: 'sample',
                    action: 'reduced',
                    quantity: required,
                    unitCost,
                    totalCost: itemTotalCost,
                    warehouseId,
                });
            }
        }

        // Create training cost log with idempotency key
        const [costLog] = await db.insert(schema.trainingCostLogs).values({
            trainingSetId: id,
            trainingName: trainingSet.trainingName,
            executedBy: userId,
            executedByName: userName,
            participants,
            setsUsed: multiplier,
            totalCost: String(totalTrainingCost),
            idempotencyKey,
        }).returning();

        // Create training cost log items with full traceability
        // Get the training set items to preserve original unit information
        const trainingItemsMap = new Map(trainingSet.items.map(item => [item.itemName.toLowerCase(), item.unit || 'unit']));

        const costLogItems = processed
            .filter(p => p.action === 'reduced' || p.action === 'monitored')
            .map(p => ({
                trainingCostLogId: costLog.id,
                itemName: p.item,
                itemType: p.type,
                quantity: String(p.quantity),
                // Use the original unit from training set item, not hardcoded
                unit: trainingItemsMap.get(p.item.toLowerCase()) || 'unit',
                unitCost: String(p.unitCost),
                totalCost: String(p.totalCost),
                warehouseItemId: p.type === 'consumable' || p.type === 'barang' || p.type === 'equipment' ? p.warehouseId : null,
                warehouseChemicalId: p.type === 'reagent' || p.type === 'standard' || p.type === 'reagent_standard' || p.type === 'sample' ? p.warehouseId : null,
            }));

        if (costLogItems.length > 0) {
            await db.insert(schema.trainingCostLogItems).values(costLogItems);
        }

        return {
            success: true,
            message: `Training berhasil diproses untuk ${participants} peserta`,
            processed,
            costLogId: costLog.id,
            totalCost: totalTrainingCost,
        };
    }
}

export const trainingService = new TrainingService();

