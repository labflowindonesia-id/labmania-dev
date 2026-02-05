import { NextRequest, NextResponse } from 'next/server';
import { standardService } from '@/lib/services';

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

        const result = await standardService.getAll(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Standards GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data standards' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.standardName || !body.form || !body.storageLocation) {
            return NextResponse.json(
                { error: 'Nama standar, form, dan lokasi penyimpanan wajib diisi' },
                { status: 400 }
            );
        }

        const standard = await standardService.create({
            standardName: body.standardName,
            casNumber: body.casNumber || null,
            chemicalFormula: body.chemicalFormula || null,
            supplier: body.supplier || null,
            sizeValue: body.sizeValue || null,
            sizeUnit: body.sizeUnit || null,
            form: body.form,
            storageLocation: body.storageLocation,
            msdsDocument: body.msdsDocument || null,
            photo: body.productPhoto || body.photo || null,
            minimumStockLevel: body.minimumStockLevel || 0,
        });

        return NextResponse.json({ standard }, { status: 201 });
    } catch (error) {
        console.error('Standards POST error:', error);
        return NextResponse.json(
            { error: 'Gagal membuat standard baru' },
            { status: 500 }
        );
    }
}
