import { NextRequest, NextResponse } from 'next/server';
import { sampleService } from '@/lib/services';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');

        const filters = {
            search: searchParams.get('search') || undefined,
            status: searchParams.get('status') || undefined,
            location: searchParams.get('location') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: limitParam === 'all' ? 99999 : parseInt(limitParam || '10'),
        };

        const result = await sampleService.getAll(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Get samples API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.sampleName || !body.storageLocation || !body.form) {
            return NextResponse.json(
                { error: 'Nama sample, lokasi, dan bentuk harus diisi' },
                { status: 400 }
            );
        }

        const sample = await sampleService.create(body);
        return NextResponse.json({ sample }, { status: 201 });
    } catch (error) {
        console.error('Create sample API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
