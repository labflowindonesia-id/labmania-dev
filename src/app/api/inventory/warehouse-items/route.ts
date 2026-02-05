import { NextResponse } from 'next/server';
import { warehouseItemService } from '@/lib/services/warehouse-item.service';

// Cache control headers for GET requests
const CACHE_HEADERS = {
    'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');

        const filters = {
            search: searchParams.get('search') || undefined,
            category: searchParams.get('category') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: limitParam === 'all' ? 99999 : parseInt(limitParam || '10'),
        };

        const result = await warehouseItemService.getAll(filters);

        return NextResponse.json({
            data: result.data,
            pagination: result.pagination
        }, { headers: CACHE_HEADERS });
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
