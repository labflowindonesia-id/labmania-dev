import { NextRequest, NextResponse } from 'next/server';
import { StorageService, STORAGE_BUCKETS } from '@/lib/services/storage.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const catalogType = formData.get('catalogType') as string;
        const catalogId = formData.get('catalogId') as string;
        const documentType = formData.get('documentType') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'File tidak ditemukan' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Tipe file tidak didukung. Hanya PDF, DOC, dan DOCX yang diizinkan.' },
                { status: 400 }
            );
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Ukuran file terlalu besar. Maksimal 10MB.' },
                { status: 400 }
            );
        }

        // Create folder path based on catalog type and document type
        const folder = `${catalogType}/${documentType}`;

        // Upload to Supabase Storage
        const result = await StorageService.uploadFile(
            STORAGE_BUCKETS.DOCUMENTS,
            folder,
            file
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Gagal mengupload file' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            path: result.path,
            publicUrl: result.publicUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat mengupload file' },
            { status: 500 }
        );
    }
}
