import { db, schema } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';
import type { Instrument, NewInstrument, CalibrationLog, MaintenanceLog } from '@/lib/db/schema/instruments';

export interface InstrumentWithDetails extends Instrument {
    daysUntilDue: number;
    picUser?: { fullName: string };
    photoUrl?: string | null; // Frontend compatibility alias for photo
}

class InstrumentService {
    /**
     * Calculate days until calibration due
     */
    private calculateDaysUntilDue(nextCalibrationDate: string | null): number {
        if (!nextCalibrationDate) return 0;
        const today = new Date();
        const nextDate = new Date(nextCalibrationDate);
        const diffTime = nextDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Determine instrument status based on calibration date
     */
    private determineStatus(daysUntilDue: number, currentStatus: string): string {
        if (currentStatus === 'dalam_perbaikan') return 'dalam_perbaikan';
        if (daysUntilDue < 0) return 'lewat_jatuh_tempo';
        if (daysUntilDue <= 30) return 'jadwal_mendatang';
        return 'terkalibrasi';
    }

    /**
     * Get all instruments
     */
    async getAll(filters?: { status?: string; type?: string }): Promise<InstrumentWithDetails[]> {
        const instruments = await db.query.instruments.findMany({
            orderBy: desc(schema.instruments.createdAt),
            with: {
                picUser: true,
            },
        });

        let result = instruments.map(inst => ({
            ...inst,
            photoUrl: inst.photo, // Map for frontend compatibility
            daysUntilDue: this.calculateDaysUntilDue(inst.nextCalibrationDate),
        }));

        // Apply filters
        if (filters?.status && filters.status !== 'all') {
            result = result.filter(i => i.status === filters.status);
        }
        if (filters?.type && filters.type !== 'all') {
            result = result.filter(i => i.assetType === filters.type);
        }

        return result as InstrumentWithDetails[];
    }

    /**
     * Get instrument by ID
     */
    async getById(id: string): Promise<InstrumentWithDetails | null> {
        const instrument = await db.query.instruments.findFirst({
            where: eq(schema.instruments.id, id),
            with: {
                picUser: true,
                calibrationLogs: true,
                maintenanceLogs: true,
            },
        });

        if (!instrument) return null;

        return {
            ...instrument,
            photoUrl: instrument.photo, // Map for frontend compatibility
            daysUntilDue: this.calculateDaysUntilDue(instrument.nextCalibrationDate),
        } as InstrumentWithDetails;
    }

    /**
     * Create new instrument
     */
    async create(data: NewInstrument): Promise<Instrument> {
        const [instrument] = await db.insert(schema.instruments).values(data).returning();
        return instrument;
    }

    /**
     * Update instrument
     */
    async update(id: string, data: Partial<NewInstrument>): Promise<Instrument | null> {
        const [instrument] = await db
            .update(schema.instruments)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.instruments.id, id))
            .returning();
        return instrument || null;
    }

    /**
     * Delete instrument
     */
    async delete(id: string): Promise<boolean> {
        await db.delete(schema.instruments).where(eq(schema.instruments.id, id));
        return true;
    }

    /**
     * Add calibration log
     */
    async addCalibrationLog(data: Omit<CalibrationLog, 'id' | 'createdAt'>): Promise<CalibrationLog> {
        const [log] = await db.insert(schema.calibrationLogs).values(data).returning();

        // Update instrument's last and next calibration dates
        const instrument = await this.getById(data.instrumentId);
        if (instrument) {
            const nextDate = new Date(data.performedDate);
            nextDate.setMonth(nextDate.getMonth() + (instrument.calibrationInterval || 12));

            await this.update(data.instrumentId, {
                lastCalibrationDate: data.performedDate,
                nextCalibrationDate: nextDate.toISOString().split('T')[0],
                status: 'terkalibrasi',
                scheduleStatus: 'sudah_dijadwalkan',
            });
        }

        return log;
    }

    /**
     * Get calibration logs for instrument
     */
    async getCalibrationLogs(instrumentId: string): Promise<CalibrationLog[]> {
        const logs = await db.query.calibrationLogs.findMany({
            where: eq(schema.calibrationLogs.instrumentId, instrumentId),
            orderBy: desc(schema.calibrationLogs.performedDate),
        });
        return logs;
    }

    /**
     * Add maintenance log
     */
    async addMaintenanceLog(data: Omit<MaintenanceLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<MaintenanceLog> {
        const [log] = await db.insert(schema.maintenanceLogs).values(data).returning();
        return log;
    }

    /**
     * Get maintenance logs for instrument
     */
    async getMaintenanceLogs(instrumentId: string): Promise<MaintenanceLog[]> {
        const logs = await db.query.maintenanceLogs.findMany({
            where: eq(schema.maintenanceLogs.instrumentId, instrumentId),
            orderBy: desc(schema.maintenanceLogs.maintenanceDate),
        });
        return logs;
    }

    /**
     * Update calibration log
     */
    async updateCalibrationLog(id: string, data: Partial<Omit<CalibrationLog, 'id' | 'createdAt'>>): Promise<CalibrationLog | null> {
        const [log] = await db
            .update(schema.calibrationLogs)
            .set(data)
            .where(eq(schema.calibrationLogs.id, id))
            .returning();
        return log || null;
    }

    /**
     * Delete calibration log
     */
    async deleteCalibrationLog(id: string): Promise<boolean> {
        await db.delete(schema.calibrationLogs).where(eq(schema.calibrationLogs.id, id));
        return true;
    }

    /**
     * Update maintenance log
     */
    async updateMaintenanceLog(id: string, data: Partial<Omit<MaintenanceLog, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MaintenanceLog | null> {
        const [log] = await db
            .update(schema.maintenanceLogs)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.maintenanceLogs.id, id))
            .returning();
        return log || null;
    }

    /**
     * Delete maintenance log
     */
    async deleteMaintenanceLog(id: string): Promise<boolean> {
        await db.delete(schema.maintenanceLogs).where(eq(schema.maintenanceLogs.id, id));
        return true;
    }
}

export const instrumentService = new InstrumentService();

