import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { sql, and, lte, gte } from 'drizzle-orm';

// Default fallback data
const defaultStats = {
    expiredReagents: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    upcomingCalibrations: 0,
};

const defaultChartData = {
    instrumentStatusData: [
        { name: "Terkalibrasi", value: 0, color: "#22c55e" },
        { name: "Jadwal Mendatang", value: 0, color: "#3b82f6" },
        { name: "Lewat Jatuh Tempo", value: 0, color: "#ef4444" },
        { name: "Dalam Perbaikan", value: 0, color: "#eab308" },
    ],
    inventoryStockData: [
        { category: 'Reagen', tersedia: 0, menipis: 0, habis: 0 },
        { category: 'Standard', tersedia: 0, menipis: 0, habis: 0 },
        { category: 'Barang', tersedia: 0, menipis: 0, habis: 0 },
        { category: 'Consumable', tersedia: 0, menipis: 0, habis: 0 },
    ],
    monthlyUsageData: [
        { month: 'Sep', reagen: 0, consumable: 0 },
        { month: 'Okt', reagen: 0, consumable: 0 },
        { month: 'Nov', reagen: 0, consumable: 0 },
        { month: 'Des', reagen: 0, consumable: 0 },
    ],
};

// Safe query wrapper - returns default value on error instead of failing entire batch
async function safeQuery<T>(queryFn: () => Promise<T>, defaultValue: T, queryName: string): Promise<T> {
    try {
        return await queryFn();
    } catch (error) {
        console.warn(`[Dashboard API] Query "${queryName}" failed:`, error instanceof Error ? error.message : error);
        return defaultValue;
    }
}

export async function GET() {
    const startTime = Date.now();
    console.log('[Dashboard API] Starting optimized parallel fetch...');

    try {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        const todayStr = today.toISOString().split('T')[0];
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
        const fourMonthsAgoStr = fourMonthsAgo.toISOString().split('T')[0];

        // Calculate date range for schedule events: ±6 months from today
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        const sixMonthsFromNow = new Date(today);
        sixMonthsFromNow.setMonth(today.getMonth() + 6);
        const startDateStr = sixMonthsAgo.toISOString().split('T')[0];
        const endDateStr = sixMonthsFromNow.toISOString().split('T')[0];

        // ========== BATCH 1: Critical stats and lists (smaller queries) ==========
        const [
            expiringChemicals,
            upcomingCalibrations,
            expiringReagentsList,
            upcomingCalibrationsList,
            instrumentsByStatus,
            usageLogs,
        ] = await Promise.all([
            safeQuery(() => db.select({ count: sql<number>`count(*)` })
                .from(schema.warehouseChemicals)
                .where(and(
                    lte(schema.warehouseChemicals.expiredDate, thirtyDaysStr),
                    gte(schema.warehouseChemicals.expiredDate, todayStr)
                )), [{ count: 0 }], 'expiringChemicals'),
            safeQuery(() => db.select({ count: sql<number>`count(*)` })
                .from(schema.instruments)
                .where(and(
                    lte(schema.instruments.nextCalibrationDate, thirtyDaysStr),
                    gte(schema.instruments.nextCalibrationDate, todayStr)
                )), [{ count: 0 }], 'upcomingCalibrations'),
            safeQuery(() => db.select({
                id: schema.warehouseChemicals.id,
                name: schema.warehouseChemicals.name,
                expiredDate: schema.warehouseChemicals.expiredDate,
            })
                .from(schema.warehouseChemicals)
                .where(and(
                    lte(schema.warehouseChemicals.expiredDate, thirtyDaysStr),
                    gte(schema.warehouseChemicals.expiredDate, todayStr)
                ))
                .limit(5), [], 'expiringReagentsList'),
            safeQuery(() => db.select({
                id: schema.instruments.id,
                name: schema.instruments.name,
                nextCalibrationDate: schema.instruments.nextCalibrationDate,
                scheduleStatus: schema.instruments.scheduleStatus,
            })
                .from(schema.instruments)
                .where(lte(schema.instruments.nextCalibrationDate, thirtyDaysStr))
                .limit(5), [], 'upcomingCalibrationsList'),
            safeQuery(() => db.select({
                status: schema.instruments.status,
                count: sql<number>`count(*)`,
            })
                .from(schema.instruments)
                .groupBy(schema.instruments.status), [], 'instrumentsByStatus'),
            safeQuery(() => db.select({
                date: schema.usageLogs.date,
                itemType: schema.usageLogs.itemType,
                quantity: schema.usageLogs.quantityUsed,
            })
                .from(schema.usageLogs)
                .where(gte(schema.usageLogs.date, fourMonthsAgoStr)), [], 'usageLogs'),
        ]);

        console.log(`[Dashboard API] Batch 1 done in: ${Date.now() - startTime}ms`);

        // ========== BATCH 2: Catalog and stock queries (heavier queries) ==========
        const [
            reagentCatalogs,
            standardCatalogs,
            itemsCatalogs,
            chemicalStockCounts,
            itemStockSums,
            allInstruments,
            expiringChemicalsForCal,
            maintenanceLogs,
            ordersList,
        ] = await Promise.all([
            safeQuery(() => db.select({ id: schema.reagentCatalog.id, minimumStockLevel: schema.reagentCatalog.minimumStockLevel })
                .from(schema.reagentCatalog).limit(500), [], 'reagentCatalogs'),
            safeQuery(() => db.select({ id: schema.standardCatalog.id, minimumStockLevel: schema.standardCatalog.minimumStockLevel })
                .from(schema.standardCatalog).limit(500), [], 'standardCatalogs'),
            safeQuery(() => db.select({ id: schema.itemsCatalog.id, category: schema.itemsCatalog.category, minimumStockLevel: schema.itemsCatalog.minimumStockLevel })
                .from(schema.itemsCatalog).limit(500), [], 'itemsCatalogs'),
            safeQuery(() => db.select({
                catalogId: schema.warehouseChemicals.catalogId,
                catalogType: schema.warehouseChemicals.catalogType,
                count: sql<number>`count(*)`,
            })
                .from(schema.warehouseChemicals)
                .where(sql`${schema.warehouseChemicals.status} = 'tersedia'`)
                .groupBy(schema.warehouseChemicals.catalogId, schema.warehouseChemicals.catalogType), [], 'chemicalStockCounts'),
            safeQuery(() => db.select({
                catalogId: schema.warehouseItems.catalogId,
                totalQuantity: sql<number>`COALESCE(SUM(${schema.warehouseItems.currentQuantity}), 0)`,
            })
                .from(schema.warehouseItems)
                .groupBy(schema.warehouseItems.catalogId), [], 'itemStockSums'),
            safeQuery(() => db.select({
                id: schema.instruments.id,
                name: schema.instruments.name,
                nextCalibrationDate: schema.instruments.nextCalibrationDate,
                location: schema.instruments.location,
            }).from(schema.instruments).limit(50), [], 'allInstruments'),
            safeQuery(() => db.select({
                id: schema.warehouseChemicals.id,
                name: schema.warehouseChemicals.name,
                expiredDate: schema.warehouseChemicals.expiredDate,
            })
                .from(schema.warehouseChemicals)
                .where(and(
                    gte(schema.warehouseChemicals.expiredDate, startDateStr),
                    lte(schema.warehouseChemicals.expiredDate, endDateStr)
                ))
                .limit(50), [], 'expiringChemicalsForCal'),
            safeQuery(() => db.select({
                id: schema.maintenanceLogs.id,
                maintenanceDate: schema.maintenanceLogs.maintenanceDate,
                maintenanceType: schema.maintenanceLogs.maintenanceType,
                maintenanceActions: schema.maintenanceLogs.maintenanceActions,
                instrumentId: schema.maintenanceLogs.instrumentId,
            })
                .from(schema.maintenanceLogs)
                .where(and(
                    gte(schema.maintenanceLogs.maintenanceDate, startDateStr),
                    lte(schema.maintenanceLogs.maintenanceDate, endDateStr)
                ))
                .limit(50), [], 'maintenanceLogs'),
            safeQuery(() => db.select({
                id: schema.orders.id,
                orderNumber: schema.orders.orderNumber,
                orderDate: schema.orders.orderDate,
                status: schema.orders.status,
            })
                .from(schema.orders)
                .where(and(
                    gte(schema.orders.orderDate, startDateStr),
                    lte(schema.orders.orderDate, endDateStr)
                ))
                .limit(50), [], 'ordersList'),
        ]);

        console.log(`[Dashboard API] Batch 2 done in: ${Date.now() - startTime}ms`);

        // ========== Process results ==========
        const expiredCount = Number(expiringChemicals[0]?.count) || 0;
        const calibrationCount = Number(upcomingCalibrations[0]?.count) || 0;

        // Format expiring reagents
        const expiringReagentsFormatted = expiringReagentsList.map(r => {
            const expDate = new Date(r.expiredDate);
            const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return { id: r.id, name: r.name, daysLeft, location: 'TC 1' };
        });

        // Format calibrations
        const calibrationsFormatted = upcomingCalibrationsList.map(c => {
            const nextDate = c.nextCalibrationDate ? new Date(c.nextCalibrationDate) : today;
            const daysLeft = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return { id: c.id, name: c.name, daysLeft, status: daysLeft < 0 ? 'overdue' : 'scheduled' };
        });

        // Instrument status chart
        const statusColorMap: Record<string, string> = {
            terkalibrasi: '#22c55e', jadwal_mendatang: '#3b82f6',
            lewat_jatuh_tempo: '#ef4444', dalam_perbaikan: '#eab308',
        };
        const statusLabelMap: Record<string, string> = {
            terkalibrasi: 'Terkalibrasi', jadwal_mendatang: 'Jadwal Mendatang',
            lewat_jatuh_tempo: 'Lewat Jatuh Tempo', dalam_perbaikan: 'Dalam Perbaikan',
        };
        const instrumentStatusData = instrumentsByStatus.map(item => ({
            name: statusLabelMap[item.status] || item.status,
            value: Number(item.count),
            color: statusColorMap[item.status] || '#94a3b8',
        }));

        // Stock calculation using maps
        const chemicalStockMap = new Map<string, number>();
        for (const row of chemicalStockCounts) {
            chemicalStockMap.set(`${row.catalogType}:${row.catalogId}`, Number(row.count) || 0);
        }
        const itemStockMap = new Map<string, number>();
        for (const row of itemStockSums) {
            itemStockMap.set(row.catalogId, Number(row.totalQuantity) || 0);
        }

        let reagentTersedia = 0, reagentMenipis = 0, reagentHabis = 0;
        let lowStockCount = 0, outOfStockCount = 0;
        for (const r of reagentCatalogs) {
            const stock = chemicalStockMap.get(`reagent:${r.id}`) || 0;
            if (stock === 0) { reagentHabis++; outOfStockCount++; }
            else if (stock <= r.minimumStockLevel) { reagentMenipis++; lowStockCount++; }
            else { reagentTersedia++; }
        }

        let standardTersedia = 0, standardMenipis = 0, standardHabis = 0;
        for (const s of standardCatalogs) {
            const stock = chemicalStockMap.get(`standard:${s.id}`) || 0;
            if (stock === 0) standardHabis++;
            else if (stock <= s.minimumStockLevel) standardMenipis++;
            else standardTersedia++;
        }

        let barangTersedia = 0, barangMenipis = 0, barangHabis = 0;
        let consumableTersedia = 0, consumableMenipis = 0, consumableHabis = 0;
        for (const item of itemsCatalogs) {
            const stock = itemStockMap.get(item.id) || 0;
            if (item.category === 'barang') {
                if (stock === 0) barangHabis++;
                else if (stock <= item.minimumStockLevel) barangMenipis++;
                else barangTersedia++;
            } else {
                if (stock === 0) consumableHabis++;
                else if (stock <= item.minimumStockLevel) consumableMenipis++;
                else consumableTersedia++;
            }
        }

        const inventoryStockData = [
            { category: 'Reagen', tersedia: reagentTersedia, menipis: reagentMenipis, habis: reagentHabis },
            { category: 'Standard', tersedia: standardTersedia, menipis: standardMenipis, habis: standardHabis },
            { category: 'Barang', tersedia: barangTersedia, menipis: barangMenipis, habis: barangHabis },
            { category: 'Consumable', tersedia: consumableTersedia, menipis: consumableMenipis, habis: consumableHabis },
        ];

        // Monthly usage
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const monthlyUsageMap: Record<string, { reagen: number; consumable: number }> = {};
        for (const log of usageLogs) {
            const date = new Date(log.date);
            const monthKey = monthNames[date.getMonth()];
            if (!monthlyUsageMap[monthKey]) monthlyUsageMap[monthKey] = { reagen: 0, consumable: 0 };
            const qty = parseInt(String(log.quantity)) || 0;
            if (log.itemType === 'reagent' || log.itemType === 'standard') {
                monthlyUsageMap[monthKey].reagen += qty;
            } else {
                monthlyUsageMap[monthKey].consumable += qty;
            }
        }
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

        // ========== Build Schedule Events ==========
        const scheduleEvents: { id: string; title: string; date: string; type: string; location?: string | null; description?: string }[] = [];

        // Add calibration events
        for (const inst of allInstruments) {
            if (inst.nextCalibrationDate) {
                scheduleEvents.push({
                    id: `cal-${inst.id}`,
                    title: `${inst.name} Kalibrasi`,
                    date: inst.nextCalibrationDate,
                    type: 'calibration',
                    location: inst.location,
                    description: `Jadwal kalibrasi ${inst.name}`,
                });
            }
        }

        // Add expired chemical events
        for (const chem of expiringChemicalsForCal) {
            scheduleEvents.push({
                id: `exp-${chem.id}`,
                title: `${chem.name} Expired`,
                date: chem.expiredDate,
                type: 'expired',
                description: `${chem.name} mendekati tanggal kadaluarsa`,
            });
        }

        // Add maintenance events
        for (const log of maintenanceLogs) {
            scheduleEvents.push({
                id: `maint-${log.id}`,
                title: `Maintenance: ${log.maintenanceType}`,
                date: log.maintenanceDate,
                type: 'maintenance',
                description: log.maintenanceActions || `Maintenance ${log.maintenanceType}`,
            });
        }

        // Add order events
        for (const order of ordersList) {
            scheduleEvents.push({
                id: `order-${order.id}`,
                title: `Order: ${order.orderNumber}`,
                date: order.orderDate,
                type: 'order',
                description: `Pesanan ${order.orderNumber} - ${order.status}`,
            });
        }

        // Sort by date
        scheduleEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        console.log(`[Dashboard API] Total time: ${Date.now() - startTime}ms`);

        const response = NextResponse.json({
            stats: {
                expiredReagents: expiredCount,
                lowStockItems: lowStockCount,
                outOfStockItems: outOfStockCount,
                upcomingCalibrations: calibrationCount,
            },
            expiringReagents: expiringReagentsFormatted,
            upcomingCalibrations: calibrationsFormatted,
            scheduleEvents,
            instrumentStatusData: instrumentStatusData.length > 0 ? instrumentStatusData : defaultChartData.instrumentStatusData,
            inventoryStockData,
            monthlyUsageData,
        });

        // Add caching headers - cache for 30 seconds, stale-while-revalidate for 60 seconds
        response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

        return response;
    } catch (error) {
        console.error('[Dashboard API] Error:', error);
        return NextResponse.json({
            stats: defaultStats,
            expiringReagents: [],
            upcomingCalibrations: [],
            scheduleEvents: [],
            ...defaultChartData,
        });
    }
}

