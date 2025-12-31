import { db, schema } from '@/lib/db';
import { eq, desc, and, or, gte, lte } from 'drizzle-orm';
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
     * This aggregates data from various sources for the dashboard calendar
     */
    async generateCalendarEvents(): Promise<ScheduleEvent[]> {
        const events: ScheduleEvent[] = [];

        // Get scheduled events from database
        const dbEvents = await this.getAll();
        events.push(...dbEvents);

        // Get upcoming calibrations from instruments
        const instruments = await db.query.instruments.findMany();
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

        // Get expiring chemicals (next 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringChemicals = await db.query.warehouseChemicals.findMany({
            where: lte(schema.warehouseChemicals.expiredDate, thirtyDaysFromNow.toISOString().split('T')[0]),
        });

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

        // Get maintenance events from maintenance_logs
        const maintenanceLogs = await db.query.maintenanceLogs.findMany({
            with: { instrument: true }
        });

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

        // Get order events from orders
        const ordersList = await db.query.orders.findMany();

        for (const order of ordersList) {
            events.push({
                id: `order-${order.id}`,
                title: `Order: ${order.orderNumber}`,
                date: order.orderDate,
                type: 'order',
                instrumentId: null,
                location: null,
                description: `Pesanan ${order.orderNumber} - Status: ${order.status}`,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
            });
        }

        return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
}

export const scheduleService = new ScheduleService();
