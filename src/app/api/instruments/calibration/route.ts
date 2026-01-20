import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { desc } from 'drizzle-orm';
import { instrumentService } from '@/lib/services';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const assetType = searchParams.get('assetType') || '';

        const logs = await db.query.calibrationLogs.findMany({
            orderBy: desc(schema.calibrationLogs.performedDate),
            with: {
                instrument: true,
            },
        });

        // Transform to include instrument name
        let logsWithDetails = logs.map(log => ({
            ...log,
            instrumentName: log.instrument?.name || 'Unknown',
            assetType: log.instrument?.assetType || 'Unknown',
        }));

        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            logsWithDetails = logsWithDetails.filter(log =>
                log.instrumentName.toLowerCase().includes(searchLower) ||
                (log.calibratorName?.toLowerCase().includes(searchLower) ?? false)
            );
        }

        if (assetType && assetType !== 'all') {
            logsWithDetails = logsWithDetails.filter(log => log.assetType === assetType);
        }

        // Calculate pagination
        const total = logsWithDetails.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedLogs = logsWithDetails.slice(offset, offset + limit);

        return NextResponse.json({
            data: paginatedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        });
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
