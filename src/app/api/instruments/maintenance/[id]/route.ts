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

        const log = await instrumentService.updateMaintenanceLog(id, {
            instrumentId: body.instrumentId,
            maintenanceType: body.maintenanceType,
            maintenanceDate: body.maintenanceDate,
            issueDescription: body.issueDescription,
            maintenanceActions: body.maintenanceActions,
            status: body.status,
        });

        if (!log) {
            return NextResponse.json(
                { error: 'Log maintenance tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ log });
    } catch (error) {
        console.error('Update maintenance log API error:', error);
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
        await instrumentService.deleteMaintenanceLog(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete maintenance log API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
