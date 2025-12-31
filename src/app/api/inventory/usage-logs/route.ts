import { NextRequest, NextResponse } from 'next/server';
import { usageLogService } from '@/lib/services';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
            search: searchParams.get('search') || undefined,
            itemType: searchParams.get('itemType') || undefined,
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
        };

        const usageLogs = await usageLogService.getAll(filters);
        return NextResponse.json({ usageLogs });
    } catch (error) {
        console.error('Usage logs GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data usage logs' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.date || !body.userId || !body.usageItem || !body.itemType || !body.quantityUsed) {
            return NextResponse.json(
                { error: 'Tanggal, user, item, tipe item, dan jumlah wajib diisi' },
                { status: 400 }
            );
        }

        const usageLog = await usageLogService.create({
            date: body.date,
            userId: body.userId,
            usageItem: body.usageItem,
            itemType: body.itemType,
            quantityUsed: body.quantityUsed,
            unit: body.unit || null,
            notes: body.notes || null,
        });

        return NextResponse.json({ usageLog }, { status: 201 });
    } catch (error) {
        console.error('Usage logs POST error:', error);
        return NextResponse.json(
            { error: 'Gagal membuat usage log baru' },
            { status: 500 }
        );
    }
}
