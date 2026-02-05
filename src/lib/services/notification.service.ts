import { db, schema } from '@/lib/db';
import * as notificationsSchema from '@/lib/db/schema/notifications';
import { eq, desc, and, sql, lte, gte } from 'drizzle-orm';
import type { Notification, NewNotification } from '@/lib/db/schema/notifications';

export interface NotificationFilters {
    type?: string;
    isRead?: boolean;
    page?: number;
    limit?: number;
}

export interface PaginatedNotificationsResult {
    data: Notification[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    unreadCount: number;
}

// n8n Webhook URL for calibration scheduling (from environment)
const N8N_WEBHOOK_URL = process.env.N8N_NOTIFICATION_WEBHOOK_URL || 'https://n8n.srv1128584.hstgr.cloud/webhook/1a4f8402-6705-4ac9-9733-0713a19dd102';

class NotificationService {
    /**
     * Get all notifications with filters
     */
    async getAll(filters?: NotificationFilters): Promise<PaginatedNotificationsResult> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;

        try {
            // Use direct select instead of db.query to avoid schema export dependency
            const allNotifications = await db
                .select()
                .from(notificationsSchema.notifications)
                .orderBy(desc(notificationsSchema.notifications.createdAt));

            let filtered = allNotifications;

            if (filters?.type && filters.type !== 'all') {
                filtered = filtered.filter(n => n.type === filters.type);
            }

            if (filters?.isRead !== undefined) {
                filtered = filtered.filter(n => n.isRead === filters.isRead);
            }

            // Calculate unread count
            const unreadCount = allNotifications.filter(n => !n.isRead).length;

            // Pagination
            const total = filtered.length;
            const totalPages = Math.ceil(total / limit);
            const offset = (page - 1) * limit;
            const paginatedData = filtered.slice(offset, offset + limit);

            return {
                data: paginatedData,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                },
                unreadCount,
            };
        } catch (error) {
            // Table might not exist yet (migration not run)
            console.warn('Notifications query failed (table may not exist):', error);
            return {
                data: [],
                pagination: { page, limit, total: 0, totalPages: 0 },
                unreadCount: 0,
            };
        }
    }

    /**
     * Get notification by ID
     */
    async getById(id: string): Promise<Notification | null> {
        try {
            const [notification] = await db
                .select()
                .from(notificationsSchema.notifications)
                .where(eq(notificationsSchema.notifications.id, id));
            return notification || null;
        } catch {
            return null;
        }
    }

    /**
     * Create a new notification
     */
    async create(data: Omit<NewNotification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
        const [notification] = await db.insert(notificationsSchema.notifications).values(data).returning();
        return notification;
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id: string): Promise<Notification | null> {
        try {
            const [notification] = await db
                .update(notificationsSchema.notifications)
                .set({ isRead: true, updatedAt: new Date() })
                .where(eq(notificationsSchema.notifications.id, id))
                .returning();
            return notification || null;
        } catch {
            return null;
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<number> {
        try {
            const unread = await db
                .select()
                .from(notificationsSchema.notifications)
                .where(eq(notificationsSchema.notifications.isRead, false));

            for (const n of unread) {
                await db
                    .update(notificationsSchema.notifications)
                    .set({ isRead: true, updatedAt: new Date() })
                    .where(eq(notificationsSchema.notifications.id, n.id));
            }

            return unread.length;
        } catch {
            return 0;
        }
    }

    /**
     * Delete notification
     */
    async delete(id: string): Promise<boolean> {
        try {
            await db.delete(notificationsSchema.notifications).where(eq(notificationsSchema.notifications.id, id));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get unread count
     */
    async getUnreadCount(): Promise<number> {
        try {
            const result = await db
                .select({ count: sql<number>`count(*)` })
                .from(notificationsSchema.notifications)
                .where(eq(notificationsSchema.notifications.isRead, false));
            return Number(result[0]?.count) || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Check and create H-30 notifications for instruments
     * Called by cron job daily
     */
    async checkAndCreateInstrumentNotifications(): Promise<number> {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const todayStr = today.toISOString().split('T')[0];
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

        // Get instruments due for calibration within 30 days
        const instruments = await db.query.instruments.findMany({
            where: and(
                lte(schema.instruments.nextCalibrationDate, thirtyDaysStr),
                gte(schema.instruments.nextCalibrationDate, todayStr)
            ),
        });

        let createdCount = 0;

        for (const instrument of instruments) {
            // Check if notification already exists for this instrument
            const [existingNotification] = await db
                .select()
                .from(notificationsSchema.notifications)
                .where(and(
                    eq(notificationsSchema.notifications.referenceId, instrument.id),
                    eq(notificationsSchema.notifications.referenceType, 'instrument'),
                    eq(notificationsSchema.notifications.type, 'calibration_h30')
                ));

            if (!existingNotification) {
                const daysUntilDue = Math.ceil(
                    (new Date(instrument.nextCalibrationDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );

                // Create notification
                await this.create({
                    type: 'calibration_h30',
                    title: `Kalibrasi ${instrument.name}`,
                    message: `Instrumen ${instrument.name} harus segera dikalibrasi sebelum ${new Date(instrument.nextCalibrationDate!).toLocaleDateString('id-ID')}. Sisa waktu: ${daysUntilDue} hari.`,
                    referenceId: instrument.id,
                    referenceType: 'instrument',
                    actionUrl: `/instruments/database/${instrument.id}`,
                    dueDate: new Date(instrument.nextCalibrationDate!),
                });

                // Update instrument status to jadwal_mendatang AND schedule_status to belum_dijadwalkan
                // Instrument will stay in 'belum_dijadwalkan' until user clicks 'Jadwalkan Sekarang'
                await db
                    .update(schema.instruments)
                    .set({
                        status: instrument.status !== 'dalam_perbaikan' ? 'jadwal_mendatang' : instrument.status,
                        scheduleStatus: 'belum_dijadwalkan',
                        updatedAt: new Date()
                    })
                    .where(eq(schema.instruments.id, instrument.id));

                createdCount++;
            }
        }

        return createdCount;
    }

    /**
     * Check and create H-30 notifications for chemicals
     * Called by cron job daily
     */
    async checkAndCreateChemicalNotifications(): Promise<number> {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const todayStr = today.toISOString().split('T')[0];
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

        // Get chemicals expiring within 30 days
        const chemicals = await db.query.warehouseChemicals.findMany({
            where: and(
                lte(schema.warehouseChemicals.expiredDate, thirtyDaysStr),
                gte(schema.warehouseChemicals.expiredDate, todayStr)
            ),
        });

        let createdCount = 0;

        for (const chemical of chemicals) {
            // Check if notification already exists for this chemical
            const [existingNotification] = await db
                .select()
                .from(notificationsSchema.notifications)
                .where(and(
                    eq(notificationsSchema.notifications.referenceId, chemical.id),
                    eq(notificationsSchema.notifications.referenceType, 'chemical'),
                    eq(notificationsSchema.notifications.type, 'expired_h30')
                ));

            if (!existingNotification) {
                const daysUntilExpiry = Math.ceil(
                    (new Date(chemical.expiredDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );

                const typeLabel = chemical.catalogType === 'standard' ? 'Standard' : 'Reagen';

                // Create notification
                await this.create({
                    type: 'expired_h30',
                    title: `${typeLabel} Mendekati Expired`,
                    message: `${chemical.name} akan expired pada ${new Date(chemical.expiredDate).toLocaleDateString('id-ID')}. Sisa waktu: ${daysUntilExpiry} hari.`,
                    referenceId: chemical.id,
                    referenceType: 'chemical',
                    actionUrl: `/inventory/warehouse?type=${chemical.catalogType}`,
                    dueDate: new Date(chemical.expiredDate),
                });

                createdCount++;
            }
        }

        return createdCount;
    }

    /**
     * Send webhook to n8n for calibration scheduling
     */
    async triggerCalibrationWebhook(instrumentId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Get instrument details
            const instrument = await db.query.instruments.findFirst({
                where: eq(schema.instruments.id, instrumentId),
            });

            if (!instrument) {
                return { success: false, error: 'Instrument not found' };
            }

            // Send webhook to n8n
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'calibration_schedule',
                    instrument: {
                        id: instrument.id,
                        name: instrument.name,
                        brand: instrument.brand,
                        model: instrument.model,
                        location: instrument.location,
                        nextCalibrationDate: instrument.nextCalibrationDate,
                        calibrationVendor: instrument.calibrationVendor,
                        calibrationVendorPhone: instrument.calibrationVendorPhone,
                    },
                    triggeredAt: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                throw new Error(`Webhook failed with status ${response.status}`);
            }

            // Update instrument schedule status
            await db
                .update(schema.instruments)
                .set({
                    scheduleStatus: 'sudah_dijadwalkan',
                    updatedAt: new Date()
                })
                .where(eq(schema.instruments.id, instrumentId));

            // Update notification as webhook sent
            await db
                .update(notificationsSchema.notifications)
                .set({
                    webhookSent: true,
                    updatedAt: new Date()
                })
                .where(and(
                    eq(notificationsSchema.notifications.referenceId, instrumentId),
                    eq(notificationsSchema.notifications.referenceType, 'instrument'),
                    eq(notificationsSchema.notifications.type, 'calibration_h30')
                ));

            // Create a "scheduled" notification
            await this.create({
                type: 'calibration_scheduled',
                title: `Kalibrasi ${instrument.name} Dijadwalkan`,
                message: `Email pemberitahuan kalibrasi telah dikirim ke vendor ${instrument.calibrationVendor || 'kalibrasi'}.`,
                referenceId: instrument.id,
                referenceType: 'instrument',
                actionUrl: `/instruments/database/${instrument.id}`,
                isRead: false,
                webhookSent: true,
            });

            return { success: true };
        } catch (error) {
            console.error('Webhook error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

export const notificationService = new NotificationService();
