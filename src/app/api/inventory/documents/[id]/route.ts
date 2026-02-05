import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/services';

/**
 * GET /api/inventory/documents/[id]
 * Get single document by ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const document = await documentService.getById(id);

        if (!document) {
            return NextResponse.json(
                { error: 'Dokumen tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ document });
    } catch (error) {
        console.error('Document GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil detail dokumen' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/inventory/documents/[id]
 * Update document
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const document = await documentService.update(id, body);

        if (!document) {
            return NextResponse.json(
                { error: 'Dokumen tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ document });
    } catch (error) {
        console.error('Document PUT error:', error);
        return NextResponse.json(
            { error: 'Gagal mengupdate dokumen' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/inventory/documents/[id]
 * Delete document
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const success = await documentService.delete(id);

        if (!success) {
            return NextResponse.json(
                { error: 'Dokumen tidak ditemukan' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: 'Dokumen berhasil dihapus' });
    } catch (error) {
        console.error('Document DELETE error:', error);
        return NextResponse.json(
            { error: 'Gagal menghapus dokumen' },
            { status: 500 }
        );
    }
}
