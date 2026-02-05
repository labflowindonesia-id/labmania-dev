import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Get single notification
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const notification = await notificationService.getById(id);

        if (!notification) {
            return NextResponse.json(
                { error: 'Notifikasi tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ notification });
    } catch (error) {
        console.error('Get notification API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

// Mark as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const notification = await notificationService.markAsRead(id);

        if (!notification) {
            return NextResponse.json(
                { error: 'Notifikasi tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ notification });
    } catch (error) {
        console.error('Update notification API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

// Delete notification
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        await notificationService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete notification API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
