import { NextRequest, NextResponse } from 'next/server';
import { sampleService } from '@/lib/services';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const sample = await sampleService.getById(id);

        if (!sample) {
            return NextResponse.json(
                { error: 'Sample tidak ditemukan' },
                { status: 404 }
            );
        }

        // Fetch warehouse records for this sample
        const warehouseRecords = await sampleService.getWarehouseItems(id);

        return NextResponse.json({ sample, warehouseRecords });
    } catch (error) {
        console.error('Sample GET by ID error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data sample' },
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

        // Build update object only with values that are provided
        const updateData: Record<string, unknown> = {};

        if (body.sampleName) updateData.sampleName = body.sampleName;
        if (body.matrix !== undefined) updateData.matrix = body.matrix || null;
        if (body.storageLocation) updateData.storageLocation = body.storageLocation;
        if (body.form) updateData.form = body.form;
        if (body.photo !== undefined) updateData.photo = body.photo || null;
        if (body.minimumStockLevel !== undefined) updateData.minimumStockLevel = parseInt(body.minimumStockLevel) || 0;

        const sample = await sampleService.update(id, updateData);

        if (!sample) {
            return NextResponse.json(
                { error: 'Sample tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ sample });
    } catch (error) {
        console.error('Sample PUT error:', error);
        return NextResponse.json(
            { error: 'Gagal mengupdate sample: ' + (error instanceof Error ? error.message : 'Unknown error') },
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
        await sampleService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Sample DELETE error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus sample' },
            { status: 500 }
        );
    }
}
