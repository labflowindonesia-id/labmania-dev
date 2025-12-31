import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password, role } = body;

        if (!username || !password || !role) {
            return NextResponse.json(
                { error: 'Username, password, dan role harus diisi' },
                { status: 400 }
            );
        }

        const result = await authService.login({ username, password, role });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: true,
            user: result.user,
        });
    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
