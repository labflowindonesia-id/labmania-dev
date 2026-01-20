import { NextRequest, NextResponse } from 'next/server';
import { itemService } from '@/lib/services';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
            search: searchParams.get('search') || undefined,
            category: searchParams.get('category') || undefined,
            status: searchParams.get('status') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
        };

        const result = await itemService.getAll(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Items GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data items' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.name || !body.category || !body.stockUnit) {
            return NextResponse.json(
                { error: 'Nama, kategori, dan satuan stok wajib diisi' },
                { status: 400 }
            );
        }

        const item = await itemService.create({
            name: body.name,
            brand: body.brand || null,
            category: body.category,
            stockUnit: body.stockUnit,
            minimumStockLevel: body.minimumStockLevel || 0,
            location: body.location || null,
        });

        return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
        console.error('Items POST error:', error);
        return NextResponse.json(
            { error: 'Gagal membuat item baru' },
            { status: 500 }
        );
    }
}
