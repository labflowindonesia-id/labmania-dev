import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services';

export async function GET() {
    try {
        const result = await authService.getSession();

        return NextResponse.json({
            user: result.user,
        });
    } catch (error) {
        console.error('Session API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
