import { NextResponse } from 'next/server';
import { warehouseChemicalService } from '@/lib/services/warehouse-chemical.service';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
            search: searchParams.get('search') || undefined,
            status: searchParams.get('status') || undefined,
            catalogType: searchParams.get('catalogType') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
        };

        const result = await warehouseChemicalService.getAll(filters);

        // Calculate days until expiry for each chemical
        const chemicalsWithExpiry = result.data.map(chemical => {
            const expiredDate = new Date(chemical.expiredDate);
            const today = new Date();
            const diffTime = expiredDate.getTime() - today.getTime();
            const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                ...chemical,
                daysUntilExpiry,
            };
        });

        return NextResponse.json({
            data: chemicalsWithExpiry,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching warehouse chemicals:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data warehouse chemicals' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const chemical = await warehouseChemicalService.create(body);

        return NextResponse.json({ data: chemical }, { status: 201 });
    } catch (error) {
        console.error('Error creating warehouse chemical:', error);
        return NextResponse.json(
            { error: 'Gagal menambahkan warehouse chemical' },
            { status: 500 }
        );
    }
}
