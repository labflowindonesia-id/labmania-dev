import { NextRequest, NextResponse } from 'next/server';
import { costService } from '@/lib/services';

/**
 * GET /api/reports/training-costs/[id]
 * Get single training cost log by ID with items
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const costLog = await costService.getTrainingCostLogById(id);

        if (!costLog) {
            return NextResponse.json(
                { error: 'Training cost log tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ costLog });
    } catch (error) {
        console.error('Training cost log GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil detail biaya training' },
            { status: 500 }
        );
    }
}
