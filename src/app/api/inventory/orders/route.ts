import { NextRequest, NextResponse } from 'next/server';
import { orderService, authService } from '@/lib/services';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
            search: searchParams.get('search') || undefined,
            status: searchParams.get('status') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
        };

        const result = await orderService.getAll(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Get orders API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await authService.getSession();
        if (!session.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();

        if (!body.items || body.items.length === 0) {
            return NextResponse.json(
                { error: 'Order harus memiliki minimal 1 item' },
                { status: 400 }
            );
        }

        const order = await orderService.create({
            orderDate: body.orderDate || new Date().toISOString().split('T')[0],
            orderedBy: session.user.id,
            items: body.items,
            notes: body.notes,
        });

        return NextResponse.json({ data: order }, { status: 201 });
    } catch (error) {
        console.error('Create order API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
