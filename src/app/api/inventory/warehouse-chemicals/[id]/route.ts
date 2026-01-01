import { NextRequest, NextResponse } from 'next/server';
import { warehouseChemicalService } from '@/lib/services/warehouse-chemical.service';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const chemical = await warehouseChemicalService.getById(id);

        if (!chemical) {
            return NextResponse.json(
                { error: 'Item tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: chemical });
    } catch (error) {
        console.error('Get warehouse chemical error:', error);
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
        await warehouseChemicalService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete warehouse chemical error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus item' },
            { status: 500 }
        );
    }
}
