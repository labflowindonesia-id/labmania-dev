import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { sql, and, lte, gte } from 'drizzle-orm';
import { scheduleService } from '@/lib/services';

export async function GET() {
    try {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        // Count expiring reagents (within 30 days)
        const expiringChemicals = await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.warehouseChemicals)
            .where(
                and(
                    lte(schema.warehouseChemicals.expiredDate, thirtyDaysFromNow.toISOString().split('T')[0]),
                    gte(schema.warehouseChemicals.expiredDate, today.toISOString().split('T')[0])
                )
            );

        // Count low stock reagents
        const reagents = await db.select().from(schema.reagentCatalog);
        let lowStockCount = 0;
        let outOfStockCount = 0;

        for (const reagent of reagents) {
            const stockResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(schema.warehouseChemicals)
                .where(
                    and(
                        sql`${schema.warehouseChemicals.catalogId} = ${reagent.id}`,
                        sql`${schema.warehouseChemicals.catalogType} = 'reagent'`,
                        sql`${schema.warehouseChemicals.status} = 'tersedia'`
                    )
                );

            const stock = Number(stockResult[0]?.count) || 0;
            if (stock === 0) {
                outOfStockCount++;
            } else if (stock < reagent.minimumStockLevel) {
                lowStockCount++;
            }
        }

        // Count upcoming calibrations
        const upcomingCalibrations = await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.instruments)
            .where(
                and(
                    lte(schema.instruments.nextCalibrationDate, thirtyDaysFromNow.toISOString().split('T')[0]),
                    gte(schema.instruments.nextCalibrationDate, today.toISOString().split('T')[0])
                )
            );

        // Get expiring reagents list
        const expiringReagentsList = await db
            .select({
                id: schema.warehouseChemicals.id,
                name: schema.warehouseChemicals.name,
                expiredDate: schema.warehouseChemicals.expiredDate,
            })
            .from(schema.warehouseChemicals)
            .where(
                and(
                    lte(schema.warehouseChemicals.expiredDate, thirtyDaysFromNow.toISOString().split('T')[0]),
                    gte(schema.warehouseChemicals.expiredDate, today.toISOString().split('T')[0])
                )
            )
            .limit(5);

        const expiringReagentsFormatted = expiringReagentsList.map(r => {
            const expDate = new Date(r.expiredDate);
            const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
                id: r.id,
                name: r.name,
                daysLeft,
                location: 'TC 1', // Default, could be improved
            };
        });

        // Get upcoming calibrations list
        const upcomingCalibrationsList = await db
            .select({
                id: schema.instruments.id,
                name: schema.instruments.name,
                nextCalibrationDate: schema.instruments.nextCalibrationDate,
                scheduleStatus: schema.instruments.scheduleStatus,
            })
            .from(schema.instruments)
            .where(
                lte(schema.instruments.nextCalibrationDate, thirtyDaysFromNow.toISOString().split('T')[0])
            )
            .limit(5);

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

        // Get schedule events using the service (includes maintenance, orders, calibration, expired)
        const scheduleEvents = await scheduleService.generateCalendarEvents();

        // === CHART DATA ===

        // 1. Instrument Status Distribution
        const instrumentsByStatus = await db
            .select({
                status: schema.instruments.status,
                count: sql<number>`count(*)`,
            })
            .from(schema.instruments)
            .groupBy(schema.instruments.status);

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

        // 2. Inventory Stock by Category
        // Reagent stock - calculate based on warehouse count vs minimum
        const reagentList = await db.select().from(schema.reagentCatalog);
        let reagentTersedia = 0, reagentMenipis = 0, reagentHabis = 0;
        for (const r of reagentList) {
            // Count warehouse items for this reagent
            const stockResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(schema.warehouseChemicals)
                .where(
                    and(
                        sql`${schema.warehouseChemicals.catalogId} = ${r.id}`,
                        sql`${schema.warehouseChemicals.catalogType} = 'reagent'`,
                        sql`${schema.warehouseChemicals.status} = 'tersedia'`
                    )
                );
            const stock = Number(stockResult[0]?.count) || 0;
            if (stock === 0) reagentHabis++;
            else if (stock <= r.minimumStockLevel) reagentMenipis++;
            else reagentTersedia++;
        }

        // Standard stock - calculate based on warehouse count vs minimum
        const standardList = await db.select().from(schema.standardCatalog);
        let standardTersedia = 0, standardMenipis = 0, standardHabis = 0;
        for (const s of standardList) {
            const stockResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(schema.warehouseChemicals)
                .where(
                    and(
                        sql`${schema.warehouseChemicals.catalogId} = ${s.id}`,
                        sql`${schema.warehouseChemicals.catalogType} = 'standard'`,
                        sql`${schema.warehouseChemicals.status} = 'tersedia'`
                    )
                );
            const stock = Number(stockResult[0]?.count) || 0;
            if (stock === 0) standardHabis++;
            else if (stock <= s.minimumStockLevel) standardMenipis++;
            else standardTersedia++;
        }

        // Items (barang) stock - calculate based on warehouseItems count
        const barangList = await db.select().from(schema.itemsCatalog).where(sql`${schema.itemsCatalog.category} = 'barang'`);
        let barangTersedia = 0, barangMenipis = 0, barangHabis = 0;
        for (const item of barangList) {
            // Sum current quantity from warehouse
            const stockResult = await db
                .select({ total: sql<number>`COALESCE(SUM(${schema.warehouseItems.currentQuantity}), 0)` })
                .from(schema.warehouseItems)
                .where(sql`${schema.warehouseItems.catalogId} = ${item.id}`);
            const stock = Number(stockResult[0]?.total) || 0;
            if (stock === 0) barangHabis++;
            else if (stock <= item.minimumStockLevel) barangMenipis++;
            else barangTersedia++;
        }

        // Consumable stock - calculate based on warehouseItems count
        const consumableList = await db.select().from(schema.itemsCatalog).where(sql`${schema.itemsCatalog.category} = 'consumable'`);
        let consumableTersedia = 0, consumableMenipis = 0, consumableHabis = 0;
        for (const item of consumableList) {
            const stockResult = await db
                .select({ total: sql<number>`COALESCE(SUM(${schema.warehouseItems.currentQuantity}), 0)` })
                .from(schema.warehouseItems)
                .where(sql`${schema.warehouseItems.catalogId} = ${item.id}`);
            const stock = Number(stockResult[0]?.total) || 0;
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

        // 3. Monthly Usage Data (last 4 months)
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

        const usageLogs = await db
            .select({
                date: schema.usageLogs.date,
                itemType: schema.usageLogs.itemType,
                quantity: schema.usageLogs.quantityUsed,
            })
            .from(schema.usageLogs)
            .where(gte(schema.usageLogs.date, fourMonthsAgo.toISOString().split('T')[0]));

        // Group by month
        const monthlyUsageMap: Record<string, { reagen: number; consumable: number }> = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        for (const log of usageLogs) {
            const date = new Date(log.date);
            const monthKey = monthNames[date.getMonth()];
            if (!monthlyUsageMap[monthKey]) {
                monthlyUsageMap[monthKey] = { reagen: 0, consumable: 0 };
            }
            const qty = parseInt(log.quantity) || 0;
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

        return NextResponse.json({
            stats: {
                expiredReagents: Number(expiringChemicals[0]?.count) || 0,
                lowStockItems: lowStockCount,
                outOfStockItems: outOfStockCount,
                upcomingCalibrations: Number(upcomingCalibrations[0]?.count) || 0,
            },
            expiringReagents: expiringReagentsFormatted,
            upcomingCalibrations: calibrationsFormatted,
            scheduleEvents: scheduleEvents,
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
