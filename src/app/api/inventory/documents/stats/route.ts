import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/services';

/**
 * GET /api/inventory/documents/stats
 * Get document statistics
 */
export async function GET() {
    try {
        const stats = await documentService.getStatistics();
        return NextResponse.json({ stats });
    } catch (error) {
        console.error('Document stats GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil statistik dokumen' },
            { status: 500 }
        );
    }
}
