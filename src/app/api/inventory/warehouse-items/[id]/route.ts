import { NextRequest, NextResponse } from 'next/server';
import { warehouseItemService } from '@/lib/services/warehouse-item.service';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const item = await warehouseItemService.getById(id);

        if (!item) {
            return NextResponse.json(
                { error: 'Item tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: item });
    } catch (error) {
        console.error('Get warehouse item error:', error);
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
        await warehouseItemService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete warehouse item error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus item' },
            { status: 500 }
        );
    }
}
