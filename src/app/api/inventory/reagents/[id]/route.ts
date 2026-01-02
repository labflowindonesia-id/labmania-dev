import { NextRequest, NextResponse } from 'next/server';
import { reagentService } from '@/lib/services';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const reagent = await reagentService.getById(id);

        if (!reagent) {
            return NextResponse.json(
                { error: 'Reagen tidak ditemukan' },
                { status: 404 }
            );
        }

        // Fetch warehouse records for this reagent
        const warehouseRecords = await reagentService.getWarehouseItems(id);

        return NextResponse.json({ reagent, warehouseRecords });
    } catch (error) {
        console.error('Reagent GET by ID error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data reagen' },
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

        console.log('Reagent PUT request body:', JSON.stringify(body, null, 2));

        // Build update object only with values that are provided
        const updateData: Record<string, unknown> = {};

        if (body.reagentName) updateData.reagentName = body.reagentName;
        if (body.casNumber !== undefined) updateData.casNumber = body.casNumber || null;
        if (body.supplier !== undefined) updateData.supplier = body.supplier || null;
        if (body.storageLocation) updateData.storageLocation = body.storageLocation;
        if (body.form) updateData.form = body.form;
        if (body.msdsDocument !== undefined) updateData.msdsDocument = body.msdsDocument || null;
        if (body.productPhoto !== undefined) updateData.productPhoto = body.productPhoto || null;
        if (body.minimumStockLevel !== undefined) updateData.minimumStockLevel = parseInt(body.minimumStockLevel) || 0;

        console.log('Reagent update data:', JSON.stringify(updateData, null, 2));

        const reagent = await reagentService.update(id, updateData);

        if (!reagent) {
            return NextResponse.json(
                { error: 'Reagen tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ reagent });
    } catch (error) {
        console.error('Reagent PUT error:', error);
        return NextResponse.json(
            { error: 'Gagal mengupdate reagen: ' + (error instanceof Error ? error.message : 'Unknown error') },
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
        await reagentService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reagent DELETE error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus reagen' },
            { status: 500 }
        );
    }
}
