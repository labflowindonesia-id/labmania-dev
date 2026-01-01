import { NextRequest, NextResponse } from 'next/server';
import { usageLogService } from '@/lib/services/usage-log.service';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const log = await usageLogService.getById(id);

        if (!log) {
            return NextResponse.json(
                { error: 'Log tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: log });
    } catch (error) {
        console.error('Get usage log error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data' },
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
        await usageLogService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete usage log error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus log' },
            { status: 500 }
        );
    }
}
