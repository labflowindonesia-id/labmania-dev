import { db, schema } from '@/lib/db';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import type { ScheduleEvent, NewScheduleEvent } from '@/lib/db/schema/instruments';

class ScheduleService {
    /**
     * Get all schedule events
     */
    async getAll(): Promise<ScheduleEvent[]> {
        const events = await db.query.scheduleEvents.findMany({
            orderBy: desc(schema.scheduleEvents.date),
        });
        return events;
    }

    /**
     * Get events for a date range
     */
    async getByDateRange(startDate: string, endDate: string): Promise<ScheduleEvent[]> {
        const events = await db.query.scheduleEvents.findMany({
            where: and(
                gte(schema.scheduleEvents.date, startDate),
                lte(schema.scheduleEvents.date, endDate)
            ),
            orderBy: schema.scheduleEvents.date,
        });
        return events;
    }

    /**
     * Get events for a specific date
     */
    async getByDate(date: string): Promise<ScheduleEvent[]> {
        const events = await db.query.scheduleEvents.findMany({
            where: eq(schema.scheduleEvents.date, date),
        });
        return events;
    }

    /**
     * Create new schedule event
     */
    async create(data: NewScheduleEvent): Promise<ScheduleEvent> {
        const [event] = await db.insert(schema.scheduleEvents).values(data).returning();
        return event;
    }

    /**
     * Update schedule event
     */
    async update(id: string, data: Partial<NewScheduleEvent>): Promise<ScheduleEvent | null> {
        const [event] = await db
            .update(schema.scheduleEvents)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.scheduleEvents.id, id))
            .returning();
        return event || null;
    }

    /**
     * Delete schedule event
     */
    async delete(id: string): Promise<boolean> {
        await db.delete(schema.scheduleEvents).where(eq(schema.scheduleEvents.id, id));
        return true;
    }

    /**
     * Generate calendar events from instruments and inventory
     * OPTIMIZED: Filters to ±6 months and uses parallel queries
     */
    async generateCalendarEvents(): Promise<ScheduleEvent[]> {
        // Calculate date range: ±6 months from today
        const today = new Date();
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        const sixMonthsFromNow = new Date(today);
        sixMonthsFromNow.setMonth(today.getMonth() + 6);

        const startDateStr = sixMonthsAgo.toISOString().split('T')[0];
        const endDateStr = sixMonthsFromNow.toISOString().split('T')[0];

        // Run all queries in parallel for better performance
        const [dbEvents, instruments, expiringChemicals, maintenanceLogs, ordersList] = await Promise.all([
            // 1. Schedule events within date range
            db.query.scheduleEvents.findMany({
                where: and(
                    gte(schema.scheduleEvents.date, startDateStr),
                    lte(schema.scheduleEvents.date, endDateStr)
                ),
                orderBy: schema.scheduleEvents.date,
            }),

            // 2. Instruments with calibration within range
            db.query.instruments.findMany({
                where: and(
                    gte(schema.instruments.nextCalibrationDate, startDateStr),
                    lte(schema.instruments.nextCalibrationDate, endDateStr)
                ),
            }),

            // 3. Chemicals expiring within range
            db.query.warehouseChemicals.findMany({
                where: and(
                    gte(schema.warehouseChemicals.expiredDate, startDateStr),
                    lte(schema.warehouseChemicals.expiredDate, endDateStr)
                ),
            }),

            // 4. Maintenance logs within range  
            db.query.maintenanceLogs.findMany({
                where: and(
                    gte(schema.maintenanceLogs.maintenanceDate, startDateStr),
                    lte(schema.maintenanceLogs.maintenanceDate, endDateStr)
                ),
                with: { instrument: true },
            }),

            // 5. Orders within range
            db.query.orders.findMany({
                where: and(
                    gte(schema.orders.orderDate, startDateStr),
                    lte(schema.orders.orderDate, endDateStr)
                ),
            }),
        ]);

        const events: ScheduleEvent[] = [];

        // Add database events
        events.push(...dbEvents);

        // Add calibration events from instruments
        for (const inst of instruments) {
            if (inst.nextCalibrationDate) {
                events.push({
                    id: `cal-${inst.id}`,
                    title: `${inst.name} Kalibrasi`,
                    date: inst.nextCalibrationDate,
                    type: 'calibration',
                    instrumentId: inst.id,
                    location: inst.location,
                    description: `Jadwal kalibrasi ${inst.name}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        }

        // Add expiring chemical events
        for (const chem of expiringChemicals) {
            events.push({
                id: `exp-${chem.id}`,
                title: `${chem.name} Exp`,
                date: chem.expiredDate,
                type: 'expired',
                instrumentId: null,
                location: null,
                description: `${chem.name} mendekati tanggal kadaluarsa`,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        // Add maintenance events
        for (const log of maintenanceLogs) {
            events.push({
                id: `maint-${log.id}`,
                title: `Maintenance: ${log.instrument?.name || 'Instrumen'}`,
                date: log.maintenanceDate,
                type: 'maintenance',
                instrumentId: log.instrumentId,
                location: log.instrument?.location || null,
                description: log.maintenanceActions || `Maintenance ${log.maintenanceType}`,
                createdAt: log.createdAt,
                updatedAt: log.updatedAt,
            });
        }

        // Add order events
        for (const order of ordersList) {
            events.push({
                id: `order-${order.id}`,
                title: `Order: ${order.orderNumber}`,
                date: order.orderDate,
                type: 'order',
                instrumentId: null,
                location: null,
                description: `Pesanan ${order.orderNumber} - ${order.status}`,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
            });
        }

        // Sort by date and limit to prevent UI overload
        const sortedEvents = events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Limit to 200 events max to prevent UI performance issues
        return sortedEvents.slice(0, 200);
    }
}

export const scheduleService = new ScheduleService();
