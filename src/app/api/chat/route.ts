import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/services';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json(
                { error: 'Pesan tidak boleh kosong' },
                { status: 400 }
            );
        }

        const response = await chatService.sendMessage(message);
        return NextResponse.json({ response });
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
