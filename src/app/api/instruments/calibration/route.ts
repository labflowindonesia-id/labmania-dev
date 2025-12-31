import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { desc } from 'drizzle-orm';
import { instrumentService } from '@/lib/services';

export async function GET() {
    try {
        const logs = await db.query.calibrationLogs.findMany({
            orderBy: desc(schema.calibrationLogs.performedDate),
            with: {
                instrument: true,
            },
        });

        // Transform to include instrument name
        const logsWithDetails = logs.map(log => ({
            ...log,
            instrumentName: log.instrument?.name || 'Unknown',
            assetType: log.instrument?.assetType || 'Unknown',
        }));

        return NextResponse.json({ logs: logsWithDetails });
    } catch (error) {
        console.error('Get calibration logs API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.instrumentId || !body.performedDate) {
            return NextResponse.json(
                { error: 'Instrument ID dan tanggal kalibrasi harus diisi' },
                { status: 400 }
            );
        }

        const log = await instrumentService.addCalibrationLog({
            instrumentId: body.instrumentId,
            performedDate: body.performedDate,
            calibratorName: body.calibratorName,
            calibratorPhone: body.calibratorPhone,
            notes: body.notes,
            jobReportDocument: body.jobReportDocument || body.documentUrl,
        });

        return NextResponse.json({ log }, { status: 201 });
    } catch (error) {
        console.error('Create calibration log API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
