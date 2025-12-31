import { NextRequest, NextResponse } from 'next/server';
import { itemService } from '@/lib/services';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const item = await itemService.getById(id);

        if (!item) {
            return NextResponse.json(
                { error: 'Item tidak ditemukan' },
                { status: 404 }
            );
        }

        // Fetch warehouse records for this item
        const warehouseRecords = await db
            .select({
                id: schema.warehouseItems.id,
                receivedDate: schema.warehouseItems.receivedDate,
                currentQuantity: schema.warehouseItems.currentQuantity,
                lotNo: schema.warehouseItems.lotNo,
                specification: schema.warehouseItems.specification,
                receivedByUser: {
                    fullName: schema.profiles.fullName,
                },
            })
            .from(schema.warehouseItems)
            .leftJoin(schema.profiles, eq(schema.warehouseItems.receivedBy, schema.profiles.id))
            .where(eq(schema.warehouseItems.catalogId, id))
            .orderBy(schema.warehouseItems.receivedDate);

        return NextResponse.json({ item, warehouseRecords });
    } catch (error) {
        console.error('Item GET by ID error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data item' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const item = await itemService.update(id, {
            name: body.name,
            brand: body.brand,
            category: body.category,
            stockUnit: body.stockUnit,
            minimumStockLevel: body.minimumStockLevel,
            location: body.location,
        });

        if (!item) {
            return NextResponse.json(
                { error: 'Item tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ item });
    } catch (error) {
        console.error('Item PUT error:', error);
        return NextResponse.json(
            { error: 'Gagal mengupdate item' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await itemService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Item DELETE error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus item' },
            { status: 500 }
        );
    }
}
