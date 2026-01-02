import { NextRequest, NextResponse } from 'next/server';
import { backupService, StorageService, STORAGE_BUCKETS } from '@/lib/services';

/**
 * GET /api/cron/backup
 * Automated backup cron job - creates backup and uploads to Supabase Storage
 * Protected by CRON_SECRET header verification
 */
export async function GET(request: NextRequest) {
    try {
        // Verify CRON_SECRET
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error('CRON_SECRET environment variable not set');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Generate backup
        console.log('Starting automated backup...');
        const { backup, results } = await backupService.generateBackupZip();

        // Log backup results
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`Backup generated: ${successCount} tables succeeded, ${failCount} tables failed`);

        // Upload to Supabase Storage
        const storagePath = `monthly/${backup.filename}`;
        const uploadResult = await StorageService.uploadBuffer(
            STORAGE_BUCKETS.BACKUPS,
            storagePath,
            backup.buffer,
            'application/zip'
        );

        if (!uploadResult.success) {
            console.error('Failed to upload backup to storage:', uploadResult.error);
            return NextResponse.json(
                {
                    error: 'Backup generated but failed to upload to storage',
                    backupResults: results,
                    uploadError: uploadResult.error,
                },
                { status: 500 }
            );
        }

        console.log('Backup uploaded successfully to:', uploadResult.path);

        return NextResponse.json({
            success: true,
            message: 'Backup completed successfully',
            filename: backup.filename,
            storagePath: uploadResult.path,
            tablesBackedUp: successCount,
            tablesFailed: failCount,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Cron backup error:', error);
        return NextResponse.json(
            { error: 'Failed to generate backup' },
            { status: 500 }
        );
    }
}
