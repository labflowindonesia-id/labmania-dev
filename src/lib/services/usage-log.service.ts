import { db, schema } from '@/lib/db';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import type { UsageLog, NewUsageLog } from '@/lib/db/schema/inventory';

export interface UsageLogWithUser extends UsageLog {
    user?: {
        fullName: string;
    };
}

export interface UsageLogFilters {
    search?: string;
    itemType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedUsageLogsResult {
    data: UsageLogWithUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

class UsageLogService {
    /**
     * Get all usage logs with user info (paginated)
     */
    async getAll(filters?: UsageLogFilters): Promise<PaginatedUsageLogsResult> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;

        const logs = await db.query.usageLogs.findMany({
            orderBy: desc(schema.usageLogs.date),
            with: {
                user: true,
            },
        });

        // Apply filters
        let filteredLogs = logs as UsageLogWithUser[];

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filteredLogs = filteredLogs.filter(
                l => l.usageItem.toLowerCase().includes(searchLower)
            );
        }

        if (filters?.itemType && filters.itemType !== 'all') {
            filteredLogs = filteredLogs.filter(l => l.itemType === filters.itemType);
        }

        if (filters?.startDate) {
            const startDate = new Date(filters.startDate);
            filteredLogs = filteredLogs.filter(l => new Date(l.date) >= startDate);
        }

        if (filters?.endDate) {
            const endDate = new Date(filters.endDate);
            filteredLogs = filteredLogs.filter(l => new Date(l.date) <= endDate);
        }

        // Calculate pagination
        const total = filteredLogs.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedLogs = filteredLogs.slice(offset, offset + limit);

        return {
            data: paginatedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get usage log by ID
     */
    async getById(id: string): Promise<UsageLogWithUser | null> {
        const log = await db.query.usageLogs.findFirst({
            where: eq(schema.usageLogs.id, id),
            with: {
                user: true,
            },
        });

        return log as UsageLogWithUser | null;
    }

    /**
     * Create new usage log
     */
    async create(data: NewUsageLog): Promise<UsageLog> {
        const [log] = await db.insert(schema.usageLogs).values(data).returning();
        return log;
    }

    /**
     * Get logs by date range
     */
    async getByDateRange(startDate: string, endDate: string): Promise<UsageLogWithUser[]> {
        const logs = await db.query.usageLogs.findMany({
            where: and(
                gte(schema.usageLogs.date, startDate),
                lte(schema.usageLogs.date, endDate)
            ),
            orderBy: desc(schema.usageLogs.date),
            with: {
                user: true,
            },
        });

        return logs as UsageLogWithUser[];
    }

    /**
     * Get usage summary by item type
     */
    async getSummaryByType(): Promise<{ itemType: string; count: number; totalQuantity: number }[]> {
        const logs = await db.query.usageLogs.findMany();

        const summary = logs.reduce((acc, log) => {
            const existing = acc.find(s => s.itemType === log.itemType);
            if (existing) {
                existing.count++;
                existing.totalQuantity += Number(log.quantityUsed);
            } else {
                acc.push({
                    itemType: log.itemType,
                    count: 1,
                    totalQuantity: Number(log.quantityUsed),
                });
            }
            return acc;
        }, [] as { itemType: string; count: number; totalQuantity: number }[]);

        return summary;
    }

    /**
     * Delete usage log by ID
     */
    async delete(id: string): Promise<boolean> {
        await db.delete(schema.usageLogs).where(eq(schema.usageLogs.id, id));
        return true;
    }
}

export const usageLogService = new UsageLogService();
