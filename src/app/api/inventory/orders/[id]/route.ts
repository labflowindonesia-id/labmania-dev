import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/lib/services/order.service';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const order = await orderService.getById(id);

        if (!order) {
            return NextResponse.json(
                { error: 'Order tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: order });
    } catch (error) {
        console.error('Get order error:', error);
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
        await orderService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete order error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus order' },
            { status: 500 }
        );
    }
}
