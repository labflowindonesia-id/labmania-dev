import { NextRequest, NextResponse } from 'next/server';
import { trainingService } from '@/lib/services';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
            search: searchParams.get('search') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
        };

        const result = await trainingService.getAll(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Training GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data training sets' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.trainingName) {
            return NextResponse.json(
                { error: 'Nama training wajib diisi' },
                { status: 400 }
            );
        }

        const trainingSet = await trainingService.create({
            trainingName: body.trainingName,
            participantsPerSet: body.participantsPerSet || 1,
            items: body.items || [],
        });

        return NextResponse.json({ trainingSet }, { status: 201 });
    } catch (error) {
        console.error('Training POST error:', error);
        return NextResponse.json(
            { error: 'Gagal membuat training set baru' },
            { status: 500 }
        );
    }
}
