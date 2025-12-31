import { NextRequest, NextResponse } from 'next/server';
import { userService, authService } from '@/lib/services';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// Middleware to check admin role
async function checkAdminRole() {
    const session = await authService.getSession();
    if (!session.user || session.user.role !== 'admin') {
        return false;
    }
    return true;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const isAdmin = await checkAdminRole();
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Akses ditolak. Hanya admin yang dapat mengakses.' },
                { status: 403 }
            );
        }

        const { id } = await context.params;
        const user = await userService.getById(id);

        if (!user) {
            return NextResponse.json(
                { error: 'User tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Get user API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const isAdmin = await checkAdminRole();
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Akses ditolak. Hanya admin yang dapat mengakses.' },
                { status: 403 }
            );
        }

        const { id } = await context.params;
        const body = await request.json();

        const result = await userService.update(id, body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ user: result.user });
    } catch (error) {
        console.error('Update user API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const isAdmin = await checkAdminRole();
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Akses ditolak. Hanya admin yang dapat mengakses.' },
                { status: 403 }
            );
        }

        const { id } = await context.params;
        const result = await userService.delete(id);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete user API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
