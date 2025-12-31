import { NextRequest, NextResponse } from 'next/server';
import { trainingService } from '@/lib/services';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const trainingSet = await trainingService.getById(id);

        if (!trainingSet) {
            return NextResponse.json(
                { error: 'Training set tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ trainingSet });
    } catch (error) {
        console.error('Training GET by ID error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data training set' },
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

        const trainingSet = await trainingService.update(id, {
            trainingName: body.trainingName,
            participantsPerSet: body.participantsPerSet,
            items: body.items,
        });

        if (!trainingSet) {
            return NextResponse.json(
                { error: 'Training set tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ trainingSet });
    } catch (error) {
        console.error('Training PUT error:', error);
        return NextResponse.json(
            { error: 'Gagal mengupdate training set' },
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
        await trainingService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Training DELETE error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus training set' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action === 'check-stock') {
            const body = await request.json();
            const participants = body.participants || 1;
            const stockCheck = await trainingService.checkStock(id, participants);
            return NextResponse.json({ stockCheck });
        }

        if (action === 'process') {
            // Get current user
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }

            const body = await request.json();
            const participants = body.participants || 1;
            const result = await trainingService.processTraining(id, participants, user.id);
            return NextResponse.json(result);
        }

        return NextResponse.json(
            { error: 'Action tidak valid' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Training POST action error:', error);
        return NextResponse.json(
            { error: 'Gagal memproses action' },
            { status: 500 }
        );
    }
}
