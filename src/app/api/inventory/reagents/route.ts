import { NextRequest, NextResponse } from 'next/server';
import { reagentService } from '@/lib/services';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');

        const filters = {
            search: searchParams.get('search') || undefined,
            status: searchParams.get('status') || undefined,
            location: searchParams.get('location') || undefined,
            sortBy: (searchParams.get('sortBy') as 'fefo' | 'name' | 'stock') || 'fefo',
            sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
            page: parseInt(searchParams.get('page') || '1'),
            limit: limitParam === 'all' ? 99999 : parseInt(limitParam || '10'),
        };

        const result = await reagentService.getAll(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Get reagents API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.reagentName || !body.storageLocation || !body.form) {
            return NextResponse.json(
                { error: 'Nama reagen, lokasi, dan bentuk harus diisi' },
                { status: 400 }
            );
        }

        const reagent = await reagentService.create(body);
        return NextResponse.json({ reagent }, { status: 201 });
    } catch (error) {
        console.error('Create reagent API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
