import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/services';

/**
 * GET /api/inventory/documents
 * Get all documents with filtering and pagination
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
            search: searchParams.get('search') || undefined,
            documentType: (searchParams.get('documentType') as 'msds' | 'coa') || undefined,
            catalogType: (searchParams.get('catalogType') as 'reagent' | 'standard') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '20'),
        };

        const result = await documentService.getAll(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Documents GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data dokumen' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/inventory/documents
 * Create new document
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.name || !body.documentType || !body.fileUrl || !body.catalogType || !body.catalogId) {
            return NextResponse.json(
                { error: 'Field name, documentType, fileUrl, catalogType, dan catalogId wajib diisi' },
                { status: 400 }
            );
        }

        // Validate documentType enum
        if (!['msds', 'coa'].includes(body.documentType)) {
            return NextResponse.json(
                { error: 'documentType harus msds atau coa' },
                { status: 400 }
            );
        }

        // Validate catalogType enum
        if (!['reagent', 'standard'].includes(body.catalogType)) {
            return NextResponse.json(
                { error: 'catalogType harus reagent atau standard' },
                { status: 400 }
            );
        }

        const document = await documentService.create({
            name: body.name,
            documentType: body.documentType,
            fileUrl: body.fileUrl,
            fileSize: body.fileSize,
            mimeType: body.mimeType,
            catalogType: body.catalogType,
            catalogId: body.catalogId,
            uploadedBy: body.uploadedBy,
        });

        return NextResponse.json({ document }, { status: 201 });
    } catch (error) {
        console.error('Documents POST error:', error);
        return NextResponse.json(
            { error: 'Gagal membuat dokumen baru' },
            { status: 500 }
        );
    }
}
