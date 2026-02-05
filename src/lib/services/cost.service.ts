import { db, schema } from '@/lib/db';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import type { TrainingCostLog, TrainingCostLogItem } from '@/lib/db/schema/inventory';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface CostCalculationResult {
    unitCost: number;
    totalCost: number;
    warehouseId: string;
    warehouseType: 'chemical' | 'item';
}

export interface TrainingCostStats {
    thisMonth: number;
    lastMonth: number;
    ytd: number;
    percentChange: number;
}

export interface CostTrendData {
    month: string;
    year: number;
    totalCost: number;
    executionCount: number;
}

export interface TrainingCostLogWithItems extends TrainingCostLog {
    items: TrainingCostLogItem[];
}

export interface CostReportFilters {
    startDate?: string;
    endDate?: string;
    trainingSetId?: string;
    page?: number;
    limit?: number;
}

// ============================================
// Cost Service
// ============================================

class CostService {
    /**
     * Generate idempotency key to prevent double execution
     */
    generateIdempotencyKey(trainingSetId: string, participants: number, userId: string): string {
        const timestamp = new Date();
        // Round to minute to allow for slight timing variations
        timestamp.setSeconds(0, 0);
        const data = `${trainingSetId}-${participants}-${userId}-${timestamp.toISOString()}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 64);
    }

    /**
     * Check if execution with same idempotency key already exists
     */
    async checkDuplicateExecution(idempotencyKey: string): Promise<boolean> {
        const existing = await db.query.trainingCostLogs.findFirst({
            where: eq(schema.trainingCostLogs.idempotencyKey, idempotencyKey),
        });
        return !!existing;
    }

    /**
     * Calculate cost for a warehouse item (consumable)
     * Uses FIFO - first available item with quantity
     */
    async calculateItemCost(itemName: string): Promise<CostCalculationResult | null> {
        const warehouseItems = await db.query.warehouseItems.findMany({
            orderBy: [schema.warehouseItems.receivedDate], // FIFO - oldest first
        });

        const matchingItem = warehouseItems.find(
            wi => wi.name.toLowerCase() === itemName.toLowerCase() &&
                wi.currentQuantity > 0 &&
                wi.unitCost !== null
        );

        if (!matchingItem || !matchingItem.unitCost) {
            return null;
        }

        return {
            unitCost: Number(matchingItem.unitCost),
            totalCost: 0, // Will be calculated by caller
            warehouseId: matchingItem.id,
            warehouseType: 'item',
        };
    }

    /**
     * Calculate cost for a warehouse chemical (reagent/standard)
     * Uses unit_cost_base (Rp/mL or Rp/g)
     */
    async calculateChemicalCost(itemName: string): Promise<CostCalculationResult | null> {
        const chemicals = await db.query.warehouseChemicals.findMany({
            orderBy: [schema.warehouseChemicals.expiredDate], // FEFO - earliest expiry first
        });

        const matchingChemical = chemicals.find(
            c => c.name.toLowerCase() === itemName.toLowerCase() &&
                Number(c.remainingAmount) > 0 &&
                c.unitCostBase !== null
        );

        if (!matchingChemical || !matchingChemical.unitCostBase) {
            // Try to calculate from totalPrice and sizeValue if unitCostBase not set
            const chemWithPrice = chemicals.find(
                c => c.name.toLowerCase() === itemName.toLowerCase() &&
                    Number(c.remainingAmount) > 0 &&
                    c.totalPrice !== null &&
                    Number(c.sizeValue) > 0
            );

            if (chemWithPrice && chemWithPrice.totalPrice) {
                const calculatedUnitCost = Number(chemWithPrice.totalPrice) / Number(chemWithPrice.sizeValue);
                return {
                    unitCost: calculatedUnitCost,
                    totalCost: 0,
                    warehouseId: chemWithPrice.id,
                    warehouseType: 'chemical',
                };
            }
            return null;
        }

        return {
            unitCost: Number(matchingChemical.unitCostBase),
            totalCost: 0,
            warehouseId: matchingChemical.id,
            warehouseType: 'chemical',
        };
    }

    /**
     * Get training cost statistics (this month, last month, YTD)
     * Includes both training cost logs AND manual usage logs
     */
    async getTrainingCostStats(): Promise<TrainingCostStats> {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const ytdStart = new Date(now.getFullYear(), 0, 1);

        // Get training cost logs
        const allTrainingLogs = await db.query.trainingCostLogs.findMany();

        // Get usage logs with costs
        const allUsageLogs = await db.query.usageLogs.findMany();

        // Calculate training log totals
        const trainingThisMonth = allTrainingLogs
            .filter(log => new Date(log.executedAt) >= thisMonthStart)
            .reduce((sum, log) => sum + Number(log.totalCost), 0);

        const trainingLastMonth = allTrainingLogs
            .filter(log => {
                const date = new Date(log.executedAt);
                return date >= lastMonthStart && date <= lastMonthEnd;
            })
            .reduce((sum, log) => sum + Number(log.totalCost), 0);

        const trainingYtd = allTrainingLogs
            .filter(log => new Date(log.executedAt) >= ytdStart)
            .reduce((sum, log) => sum + Number(log.totalCost), 0);

        // Calculate usage log totals (only logs with totalCost)
        const usageThisMonth = allUsageLogs
            .filter(log => log.totalCost && new Date(log.date) >= thisMonthStart)
            .reduce((sum, log) => sum + Number(log.totalCost || 0), 0);

        const usageLastMonth = allUsageLogs
            .filter(log => {
                if (!log.totalCost) return false;
                const date = new Date(log.date);
                return date >= lastMonthStart && date <= lastMonthEnd;
            })
            .reduce((sum, log) => sum + Number(log.totalCost || 0), 0);

        const usageYtd = allUsageLogs
            .filter(log => log.totalCost && new Date(log.date) >= ytdStart)
            .reduce((sum, log) => sum + Number(log.totalCost || 0), 0);

        // Combined totals
        const thisMonthTotal = trainingThisMonth + usageThisMonth;
        const lastMonthTotal = trainingLastMonth + usageLastMonth;
        const ytdTotal = trainingYtd + usageYtd;

        const percentChange = lastMonthTotal > 0
            ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
            : 0;

        return {
            thisMonth: thisMonthTotal,
            lastMonth: lastMonthTotal,
            ytd: ytdTotal,
            percentChange: Math.round(percentChange * 10) / 10,
        };
    }

    /**
     * Get monthly cost trends for chart
     * Includes both training cost logs AND manual usage logs
     */
    async getTrainingCostTrends(months: number = 6): Promise<CostTrendData[]> {
        const allTrainingLogs = await db.query.trainingCostLogs.findMany({
            orderBy: [desc(schema.trainingCostLogs.executedAt)],
        });

        const allUsageLogs = await db.query.usageLogs.findMany({
            orderBy: [desc(schema.usageLogs.date)],
        });

        // Group by month
        const monthlyData: Map<string, { totalCost: number; count: number }> = new Map();

        // Add training logs
        allTrainingLogs.forEach(log => {
            const date = new Date(log.executedAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            const existing = monthlyData.get(key) || { totalCost: 0, count: 0 };
            existing.totalCost += Number(log.totalCost);
            existing.count += 1;
            monthlyData.set(key, existing);
        });

        // Add usage logs (only those with totalCost)
        allUsageLogs.forEach(log => {
            if (!log.totalCost) return;
            const date = new Date(log.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            const existing = monthlyData.get(key) || { totalCost: 0, count: 0 };
            existing.totalCost += Number(log.totalCost);
            existing.count += 1;
            monthlyData.set(key, existing);
        });

        // Generate last N months
        const result: CostTrendData[] = [];
        const now = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleString('id-ID', { month: 'short' });
            const data = monthlyData.get(key) || { totalCost: 0, count: 0 };

            result.push({
                month: monthName,
                year: date.getFullYear(),
                totalCost: data.totalCost,
                executionCount: data.count,
            });
        }

        return result;
    }

    /**
     * Get paginated training cost logs with items
     * OPTIMIZED: Uses SQL-level pagination and filtering for performance
     */
    async getTrainingCostLogs(filters?: CostReportFilters): Promise<{
        data: TrainingCostLogWithItems[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 8; // Default 8 per page

        // Build WHERE conditions for SQL-level filtering
        const conditions: ReturnType<typeof and>[] = [];

        if (filters?.startDate) {
            conditions.push(gte(schema.trainingCostLogs.executedAt, new Date(filters.startDate)));
        }
        if (filters?.endDate) {
            // Add 1 day to include the end date fully
            const endDate = new Date(filters.endDate);
            endDate.setDate(endDate.getDate() + 1);
            conditions.push(lte(schema.trainingCostLogs.executedAt, endDate));
        }
        if (filters?.trainingSetId) {
            conditions.push(eq(schema.trainingCostLogs.trainingSetId, filters.trainingSetId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count with filters (optimized count query)
        const countResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.trainingCostLogs)
            .where(whereClause);
        const total = countResult[0]?.count || 0;

        // Get paginated data with SQL offset/limit
        const offset = (page - 1) * limit;
        const logs = await db.query.trainingCostLogs.findMany({
            where: whereClause,
            orderBy: [desc(schema.trainingCostLogs.executedAt)],
            limit: limit,
            offset: offset,
            with: {
                items: true,
            },
        });

        const totalPages = Math.ceil(total / limit);

        return {
            data: logs as TrainingCostLogWithItems[],
            pagination: { page, limit, total, totalPages },
        };
    }

    /**
     * Get single training cost log by ID
     */
    async getTrainingCostLogById(id: string): Promise<TrainingCostLogWithItems | null> {
        const log = await db.query.trainingCostLogs.findFirst({
            where: eq(schema.trainingCostLogs.id, id),
            with: {
                items: true,
            },
        });

        return log as TrainingCostLogWithItems | null;
    }

    /**
     * Format currency to Indonesian Rupiah
     */
    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    }

    /**
     * Format currency shorthand (e.g., 1.2 jt)
     */
    formatCurrencyShort(amount: number): string {
        if (amount >= 1000000000) {
            return `${(amount / 1000000000).toFixed(1)} M`;
        }
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)} jt`;
        }
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(0)} rb`;
        }
        return `Rp ${amount}`;
    }

    /**
     * Get paginated usage logs with cost data
     * OPTIMIZED: Uses SQL-level pagination and filtering for performance
     */
    async getUsageCostLogs(filters?: {
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: Array<{
            id: string;
            date: string;
            usageItem: string;
            itemType: string;
            quantityUsed: string;
            unit: string | null;
            unitCost: string | null;
            totalCost: string | null;
            notes: string | null;
            userName?: string;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
    }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 8; // Default 8 per page

        // Build WHERE conditions for SQL-level filtering
        // Must have totalCost > 0 to appear in cost reports
        const conditions: ReturnType<typeof and>[] = [
            sql`${schema.usageLogs.totalCost}::numeric > 0`
        ];

        if (filters?.startDate) {
            conditions.push(gte(schema.usageLogs.date, filters.startDate));
        }
        if (filters?.endDate) {
            conditions.push(lte(schema.usageLogs.date, filters.endDate));
        }

        const whereClause = and(...conditions);

        // Get total count with filters (optimized count query)
        const countResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.usageLogs)
            .where(whereClause);
        const total = countResult[0]?.count || 0;

        // Get paginated data with SQL offset/limit
        const offset = (page - 1) * limit;
        const logs = await db.query.usageLogs.findMany({
            where: whereClause,
            orderBy: [desc(schema.usageLogs.date)],
            limit: limit,
            offset: offset,
            with: {
                user: true,
            },
        });

        const totalPages = Math.ceil(total / limit);

        return {
            data: logs.map(log => ({
                id: log.id,
                date: log.date,
                usageItem: log.usageItem,
                itemType: log.itemType,
                quantityUsed: log.quantityUsed,
                unit: log.unit,
                unitCost: log.unitCost,
                totalCost: log.totalCost,
                notes: log.notes,
                userName: log.user?.fullName || undefined,
            })),
            pagination: { page, limit, total, totalPages },
        };
    }
}

export const costService = new CostService();
