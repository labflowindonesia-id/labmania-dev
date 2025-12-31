import { NextRequest, NextResponse } from 'next/server';
import { instrumentService } from '@/lib/services';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PUT(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        const log = await instrumentService.updateCalibrationLog(id, {
            performedDate: body.performedDate,
            calibratorName: body.calibratorName,
            calibratorPhone: body.calibratorPhone,
            notes: body.notes,
            jobReportDocument: body.jobReportDocument,
        });

        if (!log) {
            return NextResponse.json(
                { error: 'Log kalibrasi tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ log });
    } catch (error) {
        console.error('Update calibration log API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        await instrumentService.deleteCalibrationLog(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete calibration log API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
