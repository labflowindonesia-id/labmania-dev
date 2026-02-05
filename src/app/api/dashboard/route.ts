import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

// Safe query wrapper using Supabase client
async function safeQuery<T>(
    queryFn: () => PromiseLike<{ data: T | null; error: unknown }>,
    defaultValue: T,
    queryName: string
): Promise<T> {
    try {
        const { data, error } = await queryFn();
        if (error) {
            console.warn(`[Dashboard API] Query "${queryName}" failed:`, error);
            return defaultValue;
        }
        return data ?? defaultValue;
    } catch (error) {
        console.warn(`[Dashboard API] Query "${queryName}" exception:`, error);
        return defaultValue;
    }
}

// Safe count query wrapper - extracts count from Supabase count queries
async function safeCountQuery(
    queryFn: () => PromiseLike<{ count: number | null; error: unknown }>,
    defaultValue: number,
    queryName: string
): Promise<number> {
    try {
        const { count, error } = await queryFn();
        if (error) {
            console.warn(`[Dashboard API] Count query "${queryName}" failed:`, error);
            return defaultValue;
        }
        return count ?? defaultValue;
    } catch (error) {
        console.warn(`[Dashboard API] Count query "${queryName}" exception:`, error);
        return defaultValue;
    }
}

export async function GET() {
    const startTime = Date.now();
    console.log('[Dashboard API] Starting Supabase-based fetch...');

    try {
        const supabase = createAdminClient();

        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        const todayStr = today.toISOString().split('T')[0];
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

        // Calculate date range for schedule events: ±6 months from today
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        const sixMonthsFromNow = new Date(today);
        sixMonthsFromNow.setMonth(today.getMonth() + 6);
        const startDateStr = sixMonthsAgo.toISOString().split('T')[0];
        const endDateStr = sixMonthsFromNow.toISOString().split('T')[0];

        // ========== BATCH 1: Critical stats ==========
        console.log('[Dashboard API] Starting Batch 1...');
        const batch1Start = Date.now();

        const [
            expiringChemicalsResult,
            upcomingCalibrationsResult,
            expiringReagentsList,
            upcomingCalibrationsList,
        ] = await Promise.all([
            // Count expiring chemicals (use safeCountQuery for proper count extraction)
            safeCountQuery(
                () => supabase
                    .from('warehouse_chemicals')
                    .select('*', { count: 'exact', head: true })
                    .lte('expired_date', thirtyDaysStr)
                    .gte('expired_date', todayStr),
                0,
                'expiringChemicalsCount'
            ),
            // Count upcoming calibrations (use safeCountQuery for proper count extraction)
            safeCountQuery(
                () => supabase
                    .from('instruments')
                    .select('*', { count: 'exact', head: true })
                    .lte('next_calibration_date', thirtyDaysStr)
                    .gte('next_calibration_date', todayStr),
                0,
                'upcomingCalibrationsCount'
            ),
            // List of expiring reagents (include catalog_id for storage_location lookup)
            safeQuery(
                () => supabase
                    .from('warehouse_chemicals')
                    .select('id, name, expired_date, catalog_type, catalog_id')
                    .lte('expired_date', thirtyDaysStr)
                    .gte('expired_date', todayStr)
                    .order('expired_date', { ascending: true })
                    .limit(5),
                [],
                'expiringReagentsList'
            ),
            // List of upcoming calibrations (include schedule_status for status mapping)
            safeQuery(
                () => supabase
                    .from('instruments')
                    .select('id, name, next_calibration_date, schedule_status, location')
                    .lte('next_calibration_date', thirtyDaysStr)
                    .gte('next_calibration_date', todayStr)
                    .order('next_calibration_date', { ascending: true })
                    .limit(5),
                [],
                'upcomingCalibrationsList'
            ),
        ]);

        console.log(`[Dashboard API] Batch 1 completed in ${Date.now() - batch1Start}ms`);

        // ========== BATCH 2: Instruments and inventory data ==========
        console.log('[Dashboard API] Starting Batch 2...');
        const batch2Start = Date.now();

        const [
            allInstruments,
            warehouseChemicals,
            warehouseItems,
            reagentCatalog,
            standardCatalog,
        ] = await Promise.all([
            safeQuery(
                () => supabase.from('instruments').select('id, status'),
                [],
                'allInstruments'
            ),
            // Get warehouse chemicals with catalog_type for stock calculation
            safeQuery(
                () => supabase.from('warehouse_chemicals').select('id, catalog_type, remaining_amount, expired_date'),
                [],
                'warehouseChemicals'
            ),
            // Get warehouse items for barang/consumable stock
            safeQuery(
                () => supabase.from('warehouse_items').select('id, catalog_id, current_quantity'),
                [],
                'warehouseItems'
            ),
            // Get catalog counts for minimum stock comparison
            safeQuery(
                () => supabase.from('reagent_catalog').select('id, minimum_stock_level'),
                [],
                'reagentCatalog'
            ),
            safeQuery(
                () => supabase.from('standard_catalog').select('id, minimum_stock_level'),
                [],
                'standardCatalog'
            ),
        ]);

        console.log(`[Dashboard API] Batch 2 completed in ${Date.now() - batch2Start}ms`);

        // ========== BATCH 3: Schedule events ==========
        console.log('[Dashboard API] Starting Batch 3...');
        const batch3Start = Date.now();

        const [
            maintenanceLogs,
            orders,
            calibrationEvents,
            expiredEvents,
            usageLogs,
        ] = await Promise.all([
            safeQuery(
                () => supabase
                    .from('maintenance_logs')
                    .select('id, instrument_id, maintenance_date, status, maintenance_type, issue_description, instruments(name)')
                    .gte('maintenance_date', startDateStr)
                    .lte('maintenance_date', endDateStr),
                [],
                'maintenanceLogs'
            ),
            safeQuery(
                () => supabase
                    .from('orders')
                    .select(`
                        id,
                        order_number,
                        order_date,
                        status,
                        notes,
                        approved_date,
                        order_items(item_name, quantity)
                    `)
                    .gte('order_date', startDateStr)
                    .lte('order_date', endDateStr),
                [],
                'orders'
            ),
            // Calibration events from instruments table
            safeQuery(
                () => supabase
                    .from('instruments')
                    .select('id, name, next_calibration_date, location, schedule_status')
                    .gte('next_calibration_date', startDateStr)
                    .lte('next_calibration_date', endDateStr),
                [],
                'calibrationEvents'
            ),
            // Expired/expiring items from warehouse_chemicals
            safeQuery(
                () => supabase
                    .from('warehouse_chemicals')
                    .select('id, name, expired_date, catalog_type')
                    .gte('expired_date', startDateStr)
                    .lte('expired_date', endDateStr),
                [],
                'expiredEvents'
            ),
            // Usage logs for monthly chart (last 6 months)
            safeQuery(
                () => supabase
                    .from('usage_logs')
                    .select('id, date, item_type, quantity_used')
                    .gte('date', sixMonthsAgo.toISOString().split('T')[0])
                    .lte('date', todayStr),
                [],
                'usageLogs'
            ),
        ]);

        console.log(`[Dashboard API] Batch 3 completed in ${Date.now() - batch3Start}ms`);

        // ========== Process Results ==========

        // Process instrument status data
        const instrumentStatusCounts = {
            calibrated: 0,
            upcoming: 0,
            overdue: 0,
            maintenance: 0,
        };

        (allInstruments as { id: string; status: string }[]).forEach((inst) => {
            switch (inst.status?.toLowerCase()) {
                case 'active':
                case 'calibrated':
                case 'terkalibrasi':
                    instrumentStatusCounts.calibrated++;
                    break;
                case 'pending_calibration':
                case 'upcoming':
                case 'jadwal_mendatang':
                    instrumentStatusCounts.upcoming++;
                    break;
                case 'overdue':
                case 'expired':
                case 'lewat_jatuh_tempo':
                    instrumentStatusCounts.overdue++;
                    break;
                case 'maintenance':
                case 'under_maintenance':
                case 'dalam_perbaikan':
                    instrumentStatusCounts.maintenance++;
                    break;
            }
        });

        const instrumentStatusData = [
            { name: "Terkalibrasi", value: instrumentStatusCounts.calibrated, color: "#22c55e" },
            { name: "Jadwal Mendatang", value: instrumentStatusCounts.upcoming, color: "#3b82f6" },
            { name: "Lewat Jatuh Tempo", value: instrumentStatusCounts.overdue, color: "#ef4444" },
            { name: "Dalam Perbaikan", value: instrumentStatusCounts.maintenance, color: "#eab308" },
        ];

        // Process inventory stock data using warehouse tables
        // Stock is calculated by counting items in warehouse grouped by catalog_type
        type WarehouseChemical = { id: string; catalog_type: string | null; remaining_amount: number | null; expired_date: string | null };
        type WarehouseItem = { id: string; catalog_id: string | null; current_quantity: number | null };

        // Count chemicals by catalog_type and stock status
        const countByType = (items: WarehouseChemical[], catalogType: string) => {
            const filtered = items.filter(i => i.catalog_type === catalogType);
            let tersedia = 0, menipis = 0, habis = 0;
            filtered.forEach((item) => {
                const amount = item.remaining_amount ?? 0;
                // Menipis if less than 20% remaining (approximate), habis if 0
                if (amount <= 0) habis++;
                else if (amount < 100) menipis++; // Assumes items with <100ml/mg are low
                else tersedia++;
            });
            return { tersedia, menipis, habis };
        };

        // Count warehouse items for barang/consumable
        const countItems = (items: WarehouseItem[]) => {
            let tersedia = 0, menipis = 0, habis = 0;
            items.forEach((item) => {
                const qty = item.current_quantity ?? 0;
                if (qty <= 0) habis++;
                else if (qty <= 2) menipis++;
                else tersedia++;
            });
            return { tersedia, menipis, habis };
        };

        const reagenStock = countByType(warehouseChemicals as WarehouseChemical[], 'reagent');
        const standardStock = countByType(warehouseChemicals as WarehouseChemical[], 'standard');
        const barangStock = countItems(warehouseItems as WarehouseItem[]);
        const consumableStock = { tersedia: 0, menipis: 0, habis: 0 }; // No consumable tracking in warehouse_items

        const inventoryStockData = [
            { category: 'Reagen', ...reagenStock },
            { category: 'Standard', ...standardStock },
            { category: 'Barang', ...barangStock },
            { category: 'Consumable', ...consumableStock },
        ];

        // Calculate low stock and out of stock totals
        const lowStockItems = reagenStock.menipis + standardStock.menipis + barangStock.menipis + consumableStock.menipis;
        const outOfStockItems = reagenStock.habis + standardStock.habis + barangStock.habis + consumableStock.habis;

        // Process schedule events
        type MaintenanceLog = {
            id: string;
            instrument_id: string;
            maintenance_date: string;
            status: string;
            maintenance_type: string;
            issue_description: string;
            instruments: { name: string }[] | { name: string } | null;
        };

        type Order = {
            id: string;
            order_number: string;
            order_date: string;
            status: string;
            notes: string | null;
            approved_date: string | null;
            order_items: { item_name: string; quantity: number }[];
        };

        type CalibrationEvent = {
            id: string;
            name: string;
            next_calibration_date: string;
            location: string | null;
            schedule_status: string | null;
        };

        type ExpiredEvent = {
            id: string;
            name: string;
            expired_date: string;
            catalog_type: string | null;
        };

        const scheduleEvents = [
            // Maintenance events
            ...(maintenanceLogs as MaintenanceLog[]).map((log) => {
                // Handle instruments as either object or array (Supabase FK reference)
                const instrumentName = Array.isArray(log.instruments)
                    ? log.instruments[0]?.name
                    : log.instruments?.name;
                return {
                    id: log.id,
                    title: instrumentName ? `${log.maintenance_type === 'inspection' ? 'Maintenance inspection' : 'Maintenance'} - ${instrumentName}` : 'Maintenance',
                    date: log.maintenance_date,
                    type: 'maintenance' as const,
                    status: log.status,
                    description: log.issue_description || '',
                };
            }),
            // Order events
            ...(orders as Order[]).flatMap((order) => {
                // Create an event for each item in the order
                const items = Array.isArray(order.order_items) ? order.order_items : [];
                if (items.length === 0) {
                    return [{
                        id: order.id,
                        title: `Order ${order.order_number}`,
                        date: order.order_date,
                        type: 'order' as const,
                        status: order.status,
                        description: order.notes || 'Pesanan baru',
                    }];
                }
                return items.map((item, idx) => ({
                    id: `${order.id}-${idx}`,
                    title: `Order ${item.item_name}`,
                    date: order.order_date,
                    type: 'order' as const,
                    status: order.status,
                    description: `Qty: ${item.quantity}`,
                }));
            }),
            // Calibration events from instruments
            ...(calibrationEvents as CalibrationEvent[]).map((cal) => ({
                id: `cal-${cal.id}`,
                title: `MS Kalibrasi - ${cal.name}`,
                date: cal.next_calibration_date,
                type: 'calibration' as const,
                status: cal.schedule_status || 'pending',
                description: cal.location || '',
            })),
            // Expired/expiring items
            ...(expiredEvents as ExpiredEvent[]).map((exp) => ({
                id: `exp-${exp.id}`,
                title: `Expired - ${exp.name}`,
                date: exp.expired_date,
                type: 'expired' as const,
                status: 'warning',
                description: exp.catalog_type === 'standard' ? 'Standard' : 'Reagen',
            })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Build response
        // Calculate daysLeft helper
        const calculateDaysLeft = (dateStr: string): number => {
            const targetDate = new Date(dateStr);
            const diffTime = targetDate.getTime() - today.getTime();
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        // Type for expiring reagents list (with catalog_id for location lookup)
        type ExpiringReagent = {
            id: string;
            name: string;
            expired_date: string;
            catalog_type?: string;
            catalog_id?: string;
        };

        // Type for upcoming calibrations list with schedule_status and location
        type UpcomingCalibrationItem = {
            id: string;
            name: string;
            next_calibration_date: string;
            schedule_status?: string;
            location?: string;
        };

        // Fetch storage_location from catalog tables for expiring reagents
        const expiringList = expiringReagentsList as ExpiringReagent[];
        const storageLocationMap: Record<string, string> = {};

        // Get unique catalog_ids grouped by type
        const reagentCatalogIds = expiringList.filter(r => r.catalog_type === 'reagent' && r.catalog_id).map(r => r.catalog_id!);
        const standardCatalogIds = expiringList.filter(r => r.catalog_type === 'standard' && r.catalog_id).map(r => r.catalog_id!);
        const sampleCatalogIds = expiringList.filter(r => r.catalog_type === 'sample' && r.catalog_id).map(r => r.catalog_id!);

        // Fetch storage_location from catalog tables in PARALLEL
        const [reagentResults, standardResults, sampleResults] = await Promise.all([
            reagentCatalogIds.length > 0
                ? supabase
                    .from('reagent_catalog')
                    .select('id, storage_location')
                    .in('id', reagentCatalogIds)
                : Promise.resolve({ data: null }),
            standardCatalogIds.length > 0
                ? supabase
                    .from('standard_catalog')
                    .select('id, storage_location')
                    .in('id', standardCatalogIds)
                : Promise.resolve({ data: null }),
            sampleCatalogIds.length > 0
                ? supabase
                    .from('sample_catalog')
                    .select('id, storage_location')
                    .in('id', sampleCatalogIds)
                : Promise.resolve({ data: null }),
        ]);

        // Map results to storageLocationMap
        reagentResults.data?.forEach((r: { id: string; storage_location: string }) => {
            storageLocationMap[r.id] = r.storage_location;
        });
        standardResults.data?.forEach((s: { id: string; storage_location: string }) => {
            storageLocationMap[s.id] = s.storage_location;
        });
        sampleResults.data?.forEach((s: { id: string; storage_location: string }) => {
            storageLocationMap[s.id] = s.storage_location;
        });

        const response = {
            stats: {
                // Use actual count from count query, not limited list length
                expiredReagents: expiringChemicalsResult as number,
                lowStockItems,
                outOfStockItems,
                upcomingCalibrations: upcomingCalibrationsResult as number,
            },
            expiringReagents: expiringList.map(r => {
                // Look up storage_location from catalog map, fallback to default
                const location = (r.catalog_id && storageLocationMap[r.catalog_id])
                    ? storageLocationMap[r.catalog_id]
                    : r.catalog_type === 'reagent' ? 'Gudang Reagen' :
                        r.catalog_type === 'standard' ? 'Gudang Standar' :
                            r.catalog_type === 'sample' ? 'Gudang Sample' : 'Gudang Umum';
                return {
                    id: r.id,
                    name: r.name,
                    daysLeft: calculateDaysLeft(r.expired_date),
                    location,
                };
            }),
            // Fixed: field name changed from upcomingCalibrationsList to upcomingCalibrations
            upcomingCalibrations: (upcomingCalibrationsList as UpcomingCalibrationItem[]).map(c => ({
                id: c.id,
                name: c.name,
                daysLeft: calculateDaysLeft(c.next_calibration_date),
                status: c.schedule_status === 'sudah_dijadwalkan' ? 'scheduled' : 'pending',
            })),
            instrumentStatusData,
            inventoryStockData,
            // Aggregate monthly usage data from usage_logs
            monthlyUsageData: (() => {
                type UsageLog = {
                    id: string;
                    date: string;
                    item_type: string;
                    quantity_used: string;
                };

                const logs = usageLogs as UsageLog[];
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

                // Get last 6 months
                const monthlyData: Record<string, { reagen: number; consumable: number }> = {};
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    monthlyData[key] = { reagen: 0, consumable: 0 };
                }

                // Aggregate logs
                logs.forEach((log) => {
                    const logDate = new Date(log.date);
                    const key = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
                    if (monthlyData[key]) {
                        const qty = parseFloat(log.quantity_used) || 0;
                        if (log.item_type === 'reagent' || log.item_type === 'standard') {
                            monthlyData[key].reagen += qty;
                        } else if (log.item_type === 'consumable' || log.item_type === 'barang') {
                            monthlyData[key].consumable += qty;
                        }
                    }
                });

                // Convert to array
                return Object.entries(monthlyData).map(([key, data]) => {
                    const [year, month] = key.split('-');
                    return {
                        month: monthNames[parseInt(month) - 1],
                        reagen: Math.round(data.reagen * 100) / 100,
                        consumable: Math.round(data.consumable * 100) / 100,
                    };
                });
            })(),
            scheduleEvents,
        };

        const totalTime = Date.now() - startTime;
        console.log(`[Dashboard API] Total fetch time: ${totalTime}ms, events: ${scheduleEvents.length}`);

        return NextResponse.json(response, {
            headers: { 'Cache-Control': 'private, max-age=30' },
        });

    } catch (error) {
        console.error('[Dashboard API] Error:', error);
        return NextResponse.json({
            stats: defaultStats,
            expiringReagents: [],
            upcomingCalibrations: [],
            ...defaultChartData,
            scheduleEvents: [],
            error: 'Failed to fetch dashboard data',
        }, { status: 500 });
    }
}
