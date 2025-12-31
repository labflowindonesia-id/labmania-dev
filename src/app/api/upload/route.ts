import { NextRequest, NextResponse } from 'next/server';
import { StorageService, STORAGE_BUCKETS, BUCKET_CONFIG, StorageBucket } from '@/lib/services';

// POST /api/upload - Upload a file
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const file = formData.get('file') as File | null;
        const bucket = formData.get('bucket') as string;
        const folder = formData.get('folder') as string || '';

        // Validate required fields
        if (!file) {
            return NextResponse.json(
                { error: 'File diperlukan' },
                { status: 400 }
            );
        }

        if (!bucket) {
            return NextResponse.json(
                { error: 'Bucket diperlukan' },
                { status: 400 }
            );
        }

        // Validate bucket name
        if (!StorageService.isValidBucket(bucket)) {
            const validBuckets = StorageService.getValidBuckets();
            return NextResponse.json(
                { error: `Bucket tidak valid. Gunakan: ${validBuckets.join(', ')}` },
                { status: 400 }
            );
        }

        // Upload file
        const result = await StorageService.uploadFile(
            bucket as StorageBucket,
            folder,
            file
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            path: result.path,
            publicUrl: result.publicUrl,
        });
    } catch (error) {
        console.error('Upload API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat mengunggah file' },
            { status: 500 }
        );
    }
}

// DELETE /api/upload - Delete a file
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const bucket = searchParams.get('bucket');
        const path = searchParams.get('path');

        // Validate required fields
        if (!bucket || !path) {
            return NextResponse.json(
                { error: 'Bucket dan path diperlukan' },
                { status: 400 }
            );
        }

        // Validate bucket name
        if (!StorageService.isValidBucket(bucket)) {
            const validBuckets = StorageService.getValidBuckets();
            return NextResponse.json(
                { error: `Bucket tidak valid. Gunakan: ${validBuckets.join(', ')}` },
                { status: 400 }
            );
        }

        // Delete file
        const result = await StorageService.deleteFile(bucket as StorageBucket, path);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat menghapus file' },
            { status: 500 }
        );
    }
}

// GET /api/upload - List files in a folder or get bucket info
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const bucket = searchParams.get('bucket');
        const folder = searchParams.get('folder') || '';
        const action = searchParams.get('action') || 'list'; // 'list' | 'info' | 'buckets'

        // Return list of all valid buckets with their configurations
        if (action === 'buckets') {
            const buckets = StorageService.getValidBuckets().map(b => ({
                name: b,
                config: BUCKET_CONFIG[b]
            }));
            return NextResponse.json({ buckets });
        }

        // Validate bucket for other actions
        if (!bucket) {
            return NextResponse.json(
                { error: 'Bucket diperlukan' },
                { status: 400 }
            );
        }

        if (!StorageService.isValidBucket(bucket)) {
            const validBuckets = StorageService.getValidBuckets();
            return NextResponse.json(
                { error: `Bucket tidak valid. Gunakan: ${validBuckets.join(', ')}` },
                { status: 400 }
            );
        }

        // Return bucket configuration
        if (action === 'info') {
            const config = StorageService.getBucketConfig(bucket as StorageBucket);
            return NextResponse.json({ bucket, config });
        }

        // List files (default)
        const files = await StorageService.listFiles(bucket as StorageBucket, folder);

        return NextResponse.json({ files });
    } catch (error) {
        console.error('List files API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan saat mengambil data' },
            { status: 500 }
        );
    }
}
