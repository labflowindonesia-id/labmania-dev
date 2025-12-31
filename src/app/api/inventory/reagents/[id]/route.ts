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

        const reagent = await reagentService.update(id, {
            reagentName: body.reagentName,
            casNumber: body.casNumber,
            supplier: body.supplier,
            storageLocation: body.storageLocation,
            form: body.form,
            msdsDocument: body.msdsDocument,
            productPhoto: body.productPhoto,
            minimumStockLevel: body.minimumStockLevel,
        });

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
            { error: 'Gagal mengupdate reagen' },
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
