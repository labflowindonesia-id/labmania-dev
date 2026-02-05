import { NextResponse } from 'next/server';
import { warehouseChemicalService } from '@/lib/services/warehouse-chemical.service';

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
            status: searchParams.get('status') || undefined,
            catalogType: searchParams.get('catalogType') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: limitParam === 'all' ? 99999 : parseInt(limitParam || '10'),
        };
        const sortBy = searchParams.get('sortBy') || 'fefo';

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

        // Apply sorting based on sortBy parameter
        const sortedChemicals = [...chemicalsWithExpiry].sort((a, b) => {
            if (sortBy === 'fefo') {
                // Sort by expiry date ascending (nearest first)
                return a.daysUntilExpiry - b.daysUntilExpiry;
            } else if (sortBy === 'name') {
                // Sort by name A-Z
                return a.name.localeCompare(b.name);
            } else if (sortBy === 'newest') {
                // Sort by received date descending (newest first)
                return new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
            }
            return 0;
        });

        return NextResponse.json({
            data: sortedChemicals,
            pagination: result.pagination
        }, { headers: CACHE_HEADERS });
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
