import { NextRequest, NextResponse } from 'next/server';
import { userService, authService } from '@/lib/services';

// Middleware to check admin role
async function checkAdminRole() {
    const session = await authService.getSession();
    if (!session.user || session.user.role !== 'admin') {
        return false;
    }
    return true;
}

export async function GET(request: NextRequest) {
    try {
        const isAdmin = await checkAdminRole();
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Akses ditolak. Hanya admin yang dapat mengakses.' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const filters = {
            search: searchParams.get('search') || undefined,
            role: searchParams.get('role') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
        };

        const result = await userService.getAll(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Get users API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const isAdmin = await checkAdminRole();
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Akses ditolak. Hanya admin yang dapat mengakses.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { username, password, fullName, role } = body;

        if (!username || !password || !fullName || !role) {
            return NextResponse.json(
                { error: 'Semua field harus diisi' },
                { status: 400 }
            );
        }

        const result = await userService.create({ username, password, fullName, role });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ user: result.user }, { status: 201 });
    } catch (error) {
        console.error('Create user API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
