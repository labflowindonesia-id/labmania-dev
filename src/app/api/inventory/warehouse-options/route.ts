import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        if (!type) {
            return NextResponse.json(
                { error: 'Parameter type wajib diisi' },
                { status: 400 }
            );
        }

        let items: { id: string; name: string; unit: string }[] = [];

        if (type === 'reagent' || type === 'standard') {
            // Get from warehouse_chemicals based on catalogType
            const chemicals = await db.query.warehouseChemicals.findMany();
            items = chemicals
                .filter(c => c.catalogType === type)
                .map(c => ({
                    id: c.id,
                    name: c.name,
                    unit: c.unit,
                }));
        } else if (type === 'barang' || type === 'consumable') {
            // Get from warehouse_items based on category
            const warehouseItems = await db.query.warehouseItems.findMany();
            items = warehouseItems
                .filter(i => i.category === type)
                .map(i => ({
                    id: i.id,
                    name: i.name,
                    unit: i.unit,
                }));
        } else {
            return NextResponse.json(
                { error: 'Tipe tidak valid. Gunakan: reagent, standard, barang, consumable' },
                { status: 400 }
            );
        }

        // Remove duplicates by name
        const uniqueItems = items.reduce((acc, current) => {
            const exists = acc.find(item => item.name === current.name);
            if (!exists) {
                acc.push(current);
            }
            return acc;
        }, [] as typeof items);

        return NextResponse.json({ items: uniqueItems });
    } catch (error) {
        console.error('Warehouse options GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data warehouse options' },
            { status: 500 }
        );
    }
}
