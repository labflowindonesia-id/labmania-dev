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

        // Convert empty strings to null for optional numeric fields
        const sizeValue = body.sizeValue === '' || body.sizeValue === null || body.sizeValue === undefined
            ? null
            : body.sizeValue;

        const standard = await standardService.update(id, {
            standardName: body.standardName,
            casNumber: body.casNumber || null,
            chemicalFormula: body.chemicalFormula || null,
            supplier: body.supplier || null,
            sizeValue: sizeValue,
            sizeUnit: body.sizeUnit || null,
            form: body.form,
            storageLocation: body.storageLocation,
            msdsDocument: body.msdsDocument || null,
            photo: body.productPhoto || body.photo || null,
            minimumStockLevel: body.minimumStockLevel ?? 0,
        });

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
            { error: 'Gagal mengupdate standard' },
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
