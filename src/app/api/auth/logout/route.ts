import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services';

export async function POST() {
    try {
        const result = await authService.logout();

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logout API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
