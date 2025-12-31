import { NextRequest, NextResponse } from 'next/server';
import { instrumentService } from '@/lib/services';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const instrument = await instrumentService.getById(id);

        if (!instrument) {
            return NextResponse.json(
                { error: 'Instrumen tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ instrument });
    } catch (error) {
        console.error('Get instrument API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        // Sanitize data - only pass valid fields to the service
        const updateData: Record<string, unknown> = {};

        // String fields - convert empty strings to null
        if (body.name !== undefined) updateData.name = body.name || null;
        if (body.brand !== undefined) updateData.brand = body.brand || null;
        if (body.model !== undefined) updateData.model = body.model || null;
        if (body.serialNumber !== undefined) updateData.serialNumber = body.serialNumber || null;
        if (body.assetNumber !== undefined) updateData.assetNumber = body.assetNumber || null;
        if (body.calibrationVendor !== undefined) updateData.calibrationVendor = body.calibrationVendor || null;
        if (body.calibrationVendorPhone !== undefined) updateData.calibrationVendorPhone = body.calibrationVendorPhone || null;
        if (body.description !== undefined) updateData.description = body.description || null;
        if (body.photo !== undefined) updateData.photo = body.photo || null;

        // Location - must match enum values
        if (body.location !== undefined && ['TC 1', 'TC 2', 'TC 3'].includes(body.location)) {
            updateData.location = body.location;
        }

        // Numbers
        if (body.calibrationInterval !== undefined) {
            updateData.calibrationInterval = Number(body.calibrationInterval) || 12;
        }

        // Dates - handle empty strings
        if (body.purchaseDate !== undefined) {
            updateData.purchaseDate = body.purchaseDate || null;
        }

        // PIC - handle both UUID reference and text name
        // If pic is a valid UUID, save to pic field
        // Otherwise, save to picName field for text like 'KEP', 'GEP'
        if (body.pic) {
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.pic)) {
                updateData.pic = body.pic;
            } else {
                // Save as picName for text values like 'KEP', 'GEP'
                updateData.picName = body.pic;
            }
        }

        const instrument = await instrumentService.update(id, updateData);

        if (!instrument) {
            return NextResponse.json(
                { error: 'Instrumen tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ instrument });
    } catch (error) {
        console.error('Update instrument API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        await instrumentService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete instrument API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
