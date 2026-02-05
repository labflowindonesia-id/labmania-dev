import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external service)
// Recommended: Run daily at midnight (00:00)

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret for security (optional but recommended)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('[Cron H-30] Starting daily H-30 check...');
        const startTime = Date.now();

        // Check and create notifications for instruments
        const instrumentNotifications = await notificationService.checkAndCreateInstrumentNotifications();
        console.log(`[Cron H-30] Created ${instrumentNotifications} instrument notifications`);

        // Check and create notifications for chemicals
        const chemicalNotifications = await notificationService.checkAndCreateChemicalNotifications();
        console.log(`[Cron H-30] Created ${chemicalNotifications} chemical notifications`);

        const duration = Date.now() - startTime;
        console.log(`[Cron H-30] Completed in ${duration}ms`);

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
        console.error('[Cron H-30] Error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat menjalankan cron job' },
            { status: 500 }
        );
    }
}

// POST method for manual triggering
export async function POST(request: NextRequest) {
    return GET(request);
}
