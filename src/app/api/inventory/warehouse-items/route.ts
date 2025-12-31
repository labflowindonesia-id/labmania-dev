import { NextResponse } from 'next/server';
import { warehouseItemService } from '@/lib/services/warehouse-item.service';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || undefined;

        const items = await warehouseItemService.getAll(category);

        return NextResponse.json({ data: items });
    } catch (error) {
        console.error('Error fetching warehouse items:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data warehouse items' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const item = await warehouseItemService.create(body);

        return NextResponse.json({ data: item }, { status: 201 });
    } catch (error) {
        console.error('Error creating warehouse item:', error);
        return NextResponse.json(
            { error: 'Gagal menambahkan warehouse item' },
            { status: 500 }
        );
    }
}
