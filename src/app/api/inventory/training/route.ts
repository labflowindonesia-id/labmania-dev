import { NextRequest, NextResponse } from 'next/server';
import { trainingService } from '@/lib/services';

export async function GET() {
    try {
        const trainingSets = await trainingService.getAll();
        return NextResponse.json({ trainingSets });
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
