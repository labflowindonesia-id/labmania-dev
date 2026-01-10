import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/services';
import { checkRateLimit, getClientId, getRateLimitHeaders } from '@/lib/security';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting check
        const clientId = getClientId(request);
        const rateLimit = checkRateLimit(clientId, 'chat');

        if (!rateLimit.allowed) {
            const headers = getRateLimitHeaders('chat', rateLimit.remaining, rateLimit.resetIn);
            return NextResponse.json(
                { error: 'Terlalu banyak permintaan. Mohon tunggu sebentar sebelum mencoba lagi.' },
                { status: 429, headers }
            );
        }

        const body = await request.json();
        const { message, sessionId, userId } = body;

        if (!message) {
            return NextResponse.json(
                { error: 'Pesan tidak boleh kosong' },
                { status: 400 }
            );
        }

        // Sanitize message input
        const sanitizedMessage = String(message).trim().substring(0, 2000);

        if (!sanitizedMessage) {
            return NextResponse.json(
                { error: 'Pesan tidak boleh kosong' },
                { status: 400 }
            );
        }

        const response = await chatService.sendMessage(sanitizedMessage, sessionId, userId);

        // Include rate limit headers in successful response
        const headers = getRateLimitHeaders('chat', rateLimit.remaining, rateLimit.resetIn);
        return NextResponse.json({ response }, { headers });
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
