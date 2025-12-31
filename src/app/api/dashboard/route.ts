import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { sql, and, lte, gte, eq } from 'drizzle-orm';
import { scheduleService } from '@/lib/services/schedule.service';

export async function GET() {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

        // ============================================
        // PARALLEL FETCHING - All independent queries
        // ============================================
        const [
            // Stats queries
            expiringChemicalsCount,
            upcomingCalibrationsCount,

            // List queries
            expiringReagentsList,
            upcomingCalibrationsList,

            // Chart data queries
            instrumentsByStatus,
            usageLogs,

            // Catalog lists for stock calculation
            reagentList,
            standardList,
            barangList,
            consumableList,

            // Aggregate stock counts
            reagentStockCounts,
            standardStockCounts,
            barangStockCounts,
            consumableStockCounts,

            // Calendar events
            calendarEvents,
        ] = await Promise.all([
            // Count expiring chemicals (within 30 days)
            db.select({ count: sql<number>`count(*)` })
                .from(schema.warehouseChemicals)
                .where(and(
                    lte(schema.warehouseChemicals.expiredDate, thirtyDaysStr),
                    gte(schema.warehouseChemicals.expiredDate, todayStr)
                )),

            // Count upcoming calibrations
            db.select({ count: sql<number>`count(*)` })
                .from(schema.instruments)
                .where(and(
                    lte(schema.instruments.nextCalibrationDate, thirtyDaysStr),
                    gte(schema.instruments.nextCalibrationDate, todayStr)
                )),

            // Get expiring reagents list
            db.select({
                id: schema.warehouseChemicals.id,
                name: schema.warehouseChemicals.name,
                expiredDate: schema.warehouseChemicals.expiredDate,
            })
                .from(schema.warehouseChemicals)
                .where(and(
                    lte(schema.warehouseChemicals.expiredDate, thirtyDaysStr),
                    gte(schema.warehouseChemicals.expiredDate, todayStr)
                ))
                .limit(5),

            // Get upcoming calibrations list
            db.select({
                id: schema.instruments.id,
                name: schema.instruments.name,
                nextCalibrationDate: schema.instruments.nextCalibrationDate,
                scheduleStatus: schema.instruments.scheduleStatus,
            })
                .from(schema.instruments)
                .where(lte(schema.instruments.nextCalibrationDate, thirtyDaysStr))
                .limit(5),

            // Instrument status distribution
            db.select({
                status: schema.instruments.status,
                count: sql<number>`count(*)`,
            })
                .from(schema.instruments)
                .groupBy(schema.instruments.status),

            // Usage logs for chart (last 4 months)
            (() => {
                const fourMonthsAgo = new Date();
                fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
                return db.select({
                    date: schema.usageLogs.date,
                    itemType: schema.usageLogs.itemType,
                    quantity: schema.usageLogs.quantityUsed,
                })
                    .from(schema.usageLogs)
                    .where(gte(schema.usageLogs.date, fourMonthsAgo.toISOString().split('T')[0]));
            })(),

            // Catalog lists
            db.select().from(schema.reagentCatalog),
            db.select().from(schema.standardCatalog),
            db.select().from(schema.itemsCatalog).where(eq(schema.itemsCatalog.category, 'barang')),
            db.select().from(schema.itemsCatalog).where(eq(schema.itemsCatalog.category, 'consumable')),

            // OPTIMIZED: Aggregate stock counts with GROUP BY instead of N+1 loops
            db.select({
                catalogId: schema.warehouseChemicals.catalogId,
                count: sql<number>`count(*)`,
            })
                .from(schema.warehouseChemicals)
                .where(and(
                    eq(schema.warehouseChemicals.catalogType, 'reagent'),
                    eq(schema.warehouseChemicals.status, 'tersedia')
                ))
                .groupBy(schema.warehouseChemicals.catalogId),

            db.select({
                catalogId: schema.warehouseChemicals.catalogId,
                count: sql<number>`count(*)`,
            })
                .from(schema.warehouseChemicals)
                .where(and(
                    eq(schema.warehouseChemicals.catalogType, 'standard'),
                    eq(schema.warehouseChemicals.status, 'tersedia')
                ))
                .groupBy(schema.warehouseChemicals.catalogId),

            db.select({
                catalogId: schema.warehouseItems.catalogId,
                total: sql<number>`COALESCE(SUM(${schema.warehouseItems.currentQuantity}), 0)`,
            })
                .from(schema.warehouseItems)
                .groupBy(schema.warehouseItems.catalogId),

            db.select({
                catalogId: schema.warehouseItems.catalogId,
                total: sql<number>`COALESCE(SUM(${schema.warehouseItems.currentQuantity}), 0)`,
            })
                .from(schema.warehouseItems)
                .groupBy(schema.warehouseItems.catalogId),

            // Calendar events from schedule service
            scheduleService.generateCalendarEvents(),
        ]);

        // ============================================
        // PROCESS RESULTS
        // ============================================

        // Format expiring reagents
        const expiringReagentsFormatted = expiringReagentsList.map(r => {
            const expDate = new Date(r.expiredDate);
            const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
                id: r.id,
                name: r.name,
                daysLeft,
                location: 'TC 1',
            };
        });

        // Format upcoming calibrations
        const calibrationsFormatted = upcomingCalibrationsList.map(c => {
            const nextDate = c.nextCalibrationDate ? new Date(c.nextCalibrationDate) : today;
            const daysLeft = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
                id: c.id,
                name: c.name,
                daysLeft,
                status: daysLeft < 0 ? 'overdue' : 'scheduled',
            };
        });

        // Process instrument status chart data
        const statusColorMap: Record<string, string> = {
            terkalibrasi: '#22c55e',
            jadwal_mendatang: '#3b82f6',
            lewat_jatuh_tempo: '#ef4444',
            dalam_perbaikan: '#eab308',
        };

        const statusLabelMap: Record<string, string> = {
            terkalibrasi: 'Terkalibrasi',
            jadwal_mendatang: 'Jadwal Mendatang',
            lewat_jatuh_tempo: 'Lewat Jatuh Tempo',
            dalam_perbaikan: 'Dalam Perbaikan',
        };

        const instrumentStatusData = instrumentsByStatus.map(item => ({
            name: statusLabelMap[item.status] || item.status,
            value: Number(item.count),
            color: statusColorMap[item.status] || '#94a3b8',
        }));

        // ============================================
        // OPTIMIZED STOCK CALCULATION - O(n) instead of O(n*m)
        // ============================================

        // Build lookup maps from aggregate results
        const reagentStockMap = new Map(reagentStockCounts.map(r => [r.catalogId, Number(r.count)]));
        const standardStockMap = new Map(standardStockCounts.map(s => [s.catalogId, Number(s.count)]));
        const itemStockMap = new Map([...barangStockCounts, ...consumableStockCounts].map(i => [i.catalogId, Number(i.total)]));

        // Calculate reagent stock status
        let reagentTersedia = 0, reagentMenipis = 0, reagentHabis = 0;
        let lowStockCount = 0, outOfStockCount = 0;

        for (const r of reagentList) {
            const stock = reagentStockMap.get(r.id) || 0;
            if (stock === 0) {
                reagentHabis++;
                outOfStockCount++;
            } else if (stock <= r.minimumStockLevel) {
                reagentMenipis++;
                lowStockCount++;
            } else {
                reagentTersedia++;
            }
        }

        // Calculate standard stock status
        let standardTersedia = 0, standardMenipis = 0, standardHabis = 0;
        for (const s of standardList) {
            const stock = standardStockMap.get(s.id) || 0;
            if (stock === 0) standardHabis++;
            else if (stock <= s.minimumStockLevel) standardMenipis++;
            else standardTersedia++;
        }

        // Calculate barang stock status
        let barangTersedia = 0, barangMenipis = 0, barangHabis = 0;
        for (const item of barangList) {
            const stock = itemStockMap.get(item.id) || 0;
            if (stock === 0) barangHabis++;
            else if (stock <= item.minimumStockLevel) barangMenipis++;
            else barangTersedia++;
        }

        // Calculate consumable stock status
        let consumableTersedia = 0, consumableMenipis = 0, consumableHabis = 0;
        for (const item of consumableList) {
            const stock = itemStockMap.get(item.id) || 0;
            if (stock === 0) consumableHabis++;
            else if (stock <= item.minimumStockLevel) consumableMenipis++;
            else consumableTersedia++;
        }

        const inventoryStockData = [
            { category: 'Reagen', tersedia: reagentTersedia, menipis: reagentMenipis, habis: reagentHabis },
            { category: 'Standard', tersedia: standardTersedia, menipis: standardMenipis, habis: standardHabis },
            { category: 'Barang', tersedia: barangTersedia, menipis: barangMenipis, habis: barangHabis },
            { category: 'Consumable', tersedia: consumableTersedia, menipis: consumableMenipis, habis: consumableHabis },
        ];

        // ============================================
        // MONTHLY USAGE DATA
        // ============================================
        const monthlyUsageMap: Record<string, { reagen: number; consumable: number }> = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        for (const log of usageLogs) {
            const date = new Date(log.date);
            const monthKey = monthNames[date.getMonth()];
            if (!monthlyUsageMap[monthKey]) {
                monthlyUsageMap[monthKey] = { reagen: 0, consumable: 0 };
            }
            const qty = parseFloat(log.quantity) || 0;
            if (log.itemType === 'reagent' || log.itemType === 'standard') {
                monthlyUsageMap[monthKey].reagen += qty;
            } else {
                monthlyUsageMap[monthKey].consumable += qty;
            }
        }

        // Get last 4 months in order
        const now = new Date();
        const monthlyUsageData = [];
        for (let i = 3; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = monthNames[d.getMonth()];
            monthlyUsageData.push({
                month: monthKey,
                reagen: monthlyUsageMap[monthKey]?.reagen || 0,
                consumable: monthlyUsageMap[monthKey]?.consumable || 0,
            });
        }

        // ============================================
        // FORMAT CALENDAR EVENTS
        // ============================================
        const formattedCalendarEvents = calendarEvents.map(event => ({
            id: event.id,
            title: event.title,
            date: event.date,
            type: event.type,
            instrumentId: event.instrumentId,
            location: event.location,
            description: event.description,
        }));

        return NextResponse.json({
            stats: {
                expiredReagents: Number(expiringChemicalsCount[0]?.count) || 0,
                lowStockItems: lowStockCount,
                outOfStockItems: outOfStockCount,
                upcomingCalibrations: Number(upcomingCalibrationsCount[0]?.count) || 0,
            },
            expiringReagents: expiringReagentsFormatted,
            upcomingCalibrations: calibrationsFormatted,
            scheduleEvents: formattedCalendarEvents,
            // Chart data
            instrumentStatusData,
            inventoryStockData,
            monthlyUsageData,
        });
    } catch (error) {
        console.error('Dashboard API error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data dashboard' },
            { status: 500 }
        );
    }
}
