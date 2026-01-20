import { NextRequest, NextResponse } from 'next/server';
import { instrumentService } from '@/lib/services';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
            search: searchParams.get('search') || undefined,
            status: searchParams.get('status') || undefined,
            type: searchParams.get('type') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
        };

        const result = await instrumentService.getAll(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Get instruments API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.name || !body.assetType || !body.location) {
            return NextResponse.json(
                { error: 'Nama, tipe aset, dan lokasi harus diisi' },
                { status: 400 }
            );
        }

        const instrument = await instrumentService.create(body);
        return NextResponse.json({ instrument }, { status: 201 });
    } catch (error) {
        console.error('Create instrument API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
