import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification.service';

// Cache headers for notification API - short cache since notifications need to be relatively fresh
const CACHE_HEADERS = {
    'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const filters = {
            type: searchParams.get('type') || undefined,
            isRead: searchParams.get('isRead') === 'true' ? true : searchParams.get('isRead') === 'false' ? false : undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '20'),
        };

        const result = await notificationService.getAll(filters);
        return NextResponse.json(result, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Get notifications API error:', error);
        // Return empty data if table doesn't exist yet (migration not run)
        // This prevents breaking the header bell icon
        return NextResponse.json({
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            unreadCount: 0,
        }, { headers: CACHE_HEADERS });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.type || !body.title || !body.message || !body.referenceId || !body.referenceType) {
            return NextResponse.json(
                { error: 'Data notifikasi tidak lengkap' },
                { status: 400 }
            );
        }

        const notification = await notificationService.create(body);
        return NextResponse.json({ notification }, { status: 201 });
    } catch (error) {
        console.error('Create notification API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

// Mark all as read
export async function PATCH() {
    try {
        const count = await notificationService.markAllAsRead();
        return NextResponse.json({ success: true, updated: count });
    } catch (error) {
        console.error('Mark all as read API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
