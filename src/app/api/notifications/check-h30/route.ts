import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';

/**
 * Public API endpoint for triggering H-30 check
 * Called automatically when user opens dashboard
 * No authentication required (runs in background, non-destructive)
 */
export async function POST(request: NextRequest) {
    try {
        console.log('[API check-h30] Starting H-30 check from dashboard load...');
        const startTime = Date.now();

        // Check and create notifications for instruments
        const instrumentNotifications = await notificationService.checkAndCreateInstrumentNotifications();
        console.log(`[API check-h30] Created ${instrumentNotifications} instrument notifications`);

        // Check and create notifications for chemicals
        const chemicalNotifications = await notificationService.checkAndCreateChemicalNotifications();
        console.log(`[API check-h30] Created ${chemicalNotifications} chemical notifications`);

        const duration = Date.now() - startTime;
        console.log(`[API check-h30] Completed in ${duration}ms`);

        return NextResponse.json({
            success: true,
            results: {
                instrumentNotifications,
                chemicalNotifications,
                totalCreated: instrumentNotifications + chemicalNotifications,
            },
            duration: `${duration}ms`,
        });
    } catch (error) {
        console.error('[API check-h30] Error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat menjalankan H-30 check' },
            { status: 500 }
        );
    }
}

// GET for health check
export async function GET() {
    return NextResponse.json({ status: 'ok', endpoint: 'check-h30' });
}
