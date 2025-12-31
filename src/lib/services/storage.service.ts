import { createClient } from '@/lib/supabase/server';

// Supabase Storage buckets - matching Supabase Dashboard configuration
export const STORAGE_BUCKETS = {
    IMAGES: 'images',                           // General images (instruments, products, etc.)
    DOCUMENTS: 'documents',                     // MSDS, general documents
    CALIBRATION_REPORTS: 'calibration-reports', // Calibration job reports (PDF only)
    MAINTENANCE_PHOTOS: 'maintenance-photos',   // Maintenance log photos
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

// Bucket-specific configuration matching Supabase Storage settings
export const BUCKET_CONFIG: Record<StorageBucket, {
    maxSize: number;
    allowedTypes: string[];
    description: string;
}> = {
    'images': {
        maxSize: 5 * 1024 * 1024,  // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        description: 'JPG, PNG, WEBP, GIF'
    },
    'documents': {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        description: 'PDF, DOC, DOCX'
    },
    'calibration-reports': {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['application/pdf'],
        description: 'PDF'
    },
    'maintenance-photos': {
        maxSize: 5 * 1024 * 1024,  // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        description: 'JPG, PNG, WEBP'
    }
};

export interface UploadResult {
    success: boolean;
    path?: string;
    publicUrl?: string;
    error?: string;
}

export interface FileInfo {
    name: string;
    size: number;
    type: string;
    lastModified: Date;
}

/**
 * Generate a unique filename with timestamp and random string
 * Format: {originalBaseName}_{timestamp}_{random}.{extension}
 */
function generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop() || '';
    const baseName = originalName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 50); // Limit base name length
    return `${baseName}_${timestamp}_${randomString}.${extension}`;
}

/**
 * Validate file type for specific bucket
 */
function isValidFileType(mimeType: string, bucket: StorageBucket): boolean {
    const config = BUCKET_CONFIG[bucket];
    if (!config) return false;
    return config.allowedTypes.includes(mimeType);
}

/**
 * Validate file size for specific bucket
 */
function isValidFileSize(size: number, bucket: StorageBucket): boolean {
    const config = BUCKET_CONFIG[bucket];
    if (!config) return false;
    return size <= config.maxSize;
}

/**
 * Get human-readable max size for bucket
 */
function getMaxSizeDisplay(bucket: StorageBucket): string {
    const config = BUCKET_CONFIG[bucket];
    if (!config) return 'Unknown';
    return `${config.maxSize / (1024 * 1024)}MB`;
}

/**
 * Get allowed file types description for bucket
 */
function getAllowedTypesDescription(bucket: StorageBucket): string {
    const config = BUCKET_CONFIG[bucket];
    if (!config) return 'Unknown';
    return config.description;
}

export const StorageService = {
    /**
     * Upload a file to Supabase Storage
     * @param bucket - Target storage bucket
     * @param folder - Folder path within bucket (e.g., 'instruments/uuid-123')
     * @param file - File to upload
     */
    async uploadFile(
        bucket: StorageBucket,
        folder: string,
        file: File
    ): Promise<UploadResult> {
        try {
            // Validate bucket exists in config
            if (!BUCKET_CONFIG[bucket]) {
                return {
                    success: false,
                    error: `Bucket tidak valid: ${bucket}`,
                };
            }

            // Validate file type
            if (!isValidFileType(file.type, bucket)) {
                return {
                    success: false,
                    error: `Tipe file tidak diizinkan untuk bucket ${bucket}. Gunakan: ${getAllowedTypesDescription(bucket)}`,
                };
            }

            // Validate file size
            if (!isValidFileSize(file.size, bucket)) {
                return {
                    success: false,
                    error: `Ukuran file terlalu besar. Maksimal: ${getMaxSizeDisplay(bucket)}`,
                };
            }

            const supabase = await createClient();
            const uniqueFilename = generateUniqueFilename(file.name);
            const filePath = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

            // Convert File to ArrayBuffer for upload
            const arrayBuffer = await file.arrayBuffer();

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(filePath, arrayBuffer, {
                    contentType: file.type,
                    upsert: false,
                });

            if (error) {
                console.error('Storage upload error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }

            // Get public URL (all buckets are configured as PUBLIC)
            const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            return {
                success: true,
                path: data.path,
                publicUrl: urlData.publicUrl,
            };
        } catch (error) {
            console.error('Upload file error:', error);
            return {
                success: false,
                error: 'Terjadi kesalahan saat mengunggah file',
            };
        }
    },

    /**
     * Delete a file from Supabase Storage
     */
    async deleteFile(bucket: StorageBucket, path: string): Promise<{ success: boolean; error?: string }> {
        try {
            const supabase = await createClient();

            const { error } = await supabase.storage
                .from(bucket)
                .remove([path]);

            if (error) {
                console.error('Storage delete error:', error);
                return {
                    success: false,
                    error: error.message,
                };
            }

            return { success: true };
        } catch (error) {
            console.error('Delete file error:', error);
            return {
                success: false,
                error: 'Terjadi kesalahan saat menghapus file',
            };
        }
    },

    /**
     * Get public URL for a file
     */
    async getPublicUrl(bucket: StorageBucket, path: string): Promise<string | null> {
        try {
            const supabase = await createClient();

            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(path);

            return data.publicUrl;
        } catch (error) {
            console.error('Get public URL error:', error);
            return null;
        }
    },

    /**
     * List files in a folder
     */
    async listFiles(bucket: StorageBucket, folder: string = ''): Promise<FileInfo[]> {
        try {
            const supabase = await createClient();

            const { data, error } = await supabase.storage
                .from(bucket)
                .list(folder, {
                    limit: 100,
                    sortBy: { column: 'created_at', order: 'desc' },
                });

            if (error) {
                console.error('List files error:', error);
                return [];
            }

            return data
                .filter((item) => item.id) // Filter out folders
                .map((item) => ({
                    name: item.name,
                    size: item.metadata?.size || 0,
                    type: item.metadata?.mimetype || '',
                    lastModified: new Date(item.created_at || Date.now()),
                }));
        } catch (error) {
            console.error('List files error:', error);
            return [];
        }
    },

    /**
     * Check if a file exists
     */
    async fileExists(bucket: StorageBucket, path: string): Promise<boolean> {
        try {
            const supabase = await createClient();

            const { data, error } = await supabase.storage
                .from(bucket)
                .list(path.split('/').slice(0, -1).join('/'), {
                    search: path.split('/').pop(),
                });

            if (error) return false;

            const fileName = path.split('/').pop();
            return data.some((file) => file.name === fileName);
        } catch (error) {
            return false;
        }
    },

    /**
     * Get signed URL for a file (useful for temporary access to private files)
     */
    async getSignedUrl(
        bucket: StorageBucket,
        path: string,
        expiresIn: number = 3600
    ): Promise<string | null> {
        try {
            const supabase = await createClient();

            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, expiresIn);

            if (error) {
                console.error('Create signed URL error:', error);
                return null;
            }

            return data.signedUrl;
        } catch (error) {
            console.error('Get signed URL error:', error);
            return null;
        }
    },

    /**
     * Get bucket configuration
     */
    getBucketConfig(bucket: StorageBucket) {
        return BUCKET_CONFIG[bucket] || null;
    },

    /**
     * Get all valid bucket names
     */
    getValidBuckets(): StorageBucket[] {
        return Object.values(STORAGE_BUCKETS);
    },

    /**
     * Check if bucket name is valid
     */
    isValidBucket(bucket: string): bucket is StorageBucket {
        return Object.values(STORAGE_BUCKETS).includes(bucket as StorageBucket);
    },
};
