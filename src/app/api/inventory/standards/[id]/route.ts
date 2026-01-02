import { NextRequest, NextResponse } from 'next/server';
import { standardService } from '@/lib/services';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const standard = await standardService.getById(id);

        if (!standard) {
            return NextResponse.json(
                { error: 'Standard tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ standard });
    } catch (error) {
        console.error('Standard GET by ID error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data standard' },
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

        console.log('Standard PUT request body:', JSON.stringify(body, null, 2));

        // Build update object only with values that are provided
        const updateData: Record<string, unknown> = {};

        if (body.standardName) updateData.standardName = body.standardName;
        if (body.casNumber !== undefined) updateData.casNumber = body.casNumber || null;
        if (body.chemicalFormula !== undefined) updateData.chemicalFormula = body.chemicalFormula || null;
        if (body.supplier !== undefined) updateData.supplier = body.supplier || null;
        if (body.sizeValue !== undefined && body.sizeValue !== '' && body.sizeValue !== null) {
            updateData.sizeValue = body.sizeValue;
        } else {
            updateData.sizeValue = null;
        }
        if (body.sizeUnit !== undefined) updateData.sizeUnit = body.sizeUnit || null;
        if (body.form) updateData.form = body.form;
        if (body.storageLocation) updateData.storageLocation = body.storageLocation;
        if (body.msdsDocument !== undefined) updateData.msdsDocument = body.msdsDocument || null;
        if (body.photo !== undefined) updateData.photo = body.photo || null;
        if (body.minimumStockLevel !== undefined) updateData.minimumStockLevel = parseInt(body.minimumStockLevel) || 0;

        console.log('Standard update data:', JSON.stringify(updateData, null, 2));

        const standard = await standardService.update(id, updateData);

        if (!standard) {
            return NextResponse.json(
                { error: 'Standard tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ standard });
    } catch (error) {
        console.error('Standard PUT error:', error);
        return NextResponse.json(
            { error: 'Gagal mengupdate standard: ' + (error instanceof Error ? error.message : 'Unknown error') },
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
        await standardService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Standard DELETE error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus standard' },
            { status: 500 }
        );
    }
}
