import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';

// Trigger webhook to n8n for calibration scheduling
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.instrumentId) {
            return NextResponse.json(
                { error: 'ID instrumen harus diisi' },
                { status: 400 }
            );
        }

        const result = await notificationService.triggerCalibrationWebhook(body.instrumentId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Gagal mengirim webhook' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Webhook berhasil dikirim dan status kalibrasi diperbarui'
        });
    } catch (error) {
        console.error('Webhook API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
