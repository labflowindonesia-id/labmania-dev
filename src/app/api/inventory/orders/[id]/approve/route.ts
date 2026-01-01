import { NextRequest, NextResponse } from 'next/server';
import { orderService, authService } from '@/lib/services';

// Middleware to check manager/admin role
async function checkManagerRole() {
    const session = await authService.getSession();
    if (!session.user || (session.user.role !== 'manager' && session.user.role !== 'admin')) {
        return { allowed: false, user: null };
    }
    return { allowed: true, user: session.user };
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { allowed, user } = await checkManagerRole();

        if (!allowed || !user) {
            return NextResponse.json(
                { error: 'Akses ditolak. Hanya manager yang dapat menyetujui order.' },
                { status: 403 }
            );
        }

        // Get action from request body
        const body = await request.json();
        const action = body.action || 'approve';

        let order;
        if (action === 'reject') {
            order = await orderService.reject(id, user.id);
        } else {
            order = await orderService.approve(id, user.id);
        }

        if (!order) {
            return NextResponse.json(
                { error: 'Order tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ order });
    } catch (error) {
        console.error('Approve order API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
