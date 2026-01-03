/**
 * File Validator Utility
 * Magic bytes validation for secure file upload
 */

// Magic bytes signatures for common file types
const MAGIC_BYTES: Record<string, { signature: number[]; offset?: number }[]> = {
    // Images
    'image/jpeg': [
        { signature: [0xFF, 0xD8, 0xFF] },
    ],
    'image/png': [
        { signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
    ],
    'image/gif': [
        { signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
        { signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
    ],
    'image/webp': [
        { signature: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF header
        // WebP has RIFF....WEBP, checking just RIFF for simplicity
    ],

    // Documents
    'application/pdf': [
        { signature: [0x25, 0x50, 0x44, 0x46] }, // %PDF
    ],
    'application/msword': [
        { signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }, // DOC (OLE)
    ],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        { signature: [0x50, 0x4B, 0x03, 0x04] }, // DOCX (ZIP-based)
    ],

    // Archives
    'application/zip': [
        { signature: [0x50, 0x4B, 0x03, 0x04] },
        { signature: [0x50, 0x4B, 0x05, 0x06] }, // Empty zip
    ],
    'application/x-zip-compressed': [
        { signature: [0x50, 0x4B, 0x03, 0x04] },
    ],
};

// File extension to MIME type mapping
const EXTENSION_TO_MIME: Record<string, string[]> = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.webp': ['image/webp'],
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.zip': ['application/zip', 'application/x-zip-compressed'],
};

export interface FileValidationResult {
    valid: boolean;
    error?: string;
    detectedType?: string;
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot).toLowerCase();
}

/**
 * Check if bytes match a magic signature
 */
function matchesMagicBytes(bytes: Uint8Array, signature: number[], offset: number = 0): boolean {
    if (bytes.length < offset + signature.length) return false;

    for (let i = 0; i < signature.length; i++) {
        if (bytes[offset + i] !== signature[i]) return false;
    }
    return true;
}

/**
 * Validate file magic bytes against claimed MIME type
 */
export async function validateFileMagicBytes(
    file: File,
    expectedMimeType: string
): Promise<FileValidationResult> {
    try {
        // Read first 16 bytes for magic number detection
        const buffer = await file.slice(0, 16).arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Get signatures for expected MIME type
        const signatures = MAGIC_BYTES[expectedMimeType];

        if (!signatures) {
            // No magic bytes defined for this type, allow it
            return { valid: true };
        }

        // Check if file matches any signature
        for (const { signature, offset = 0 } of signatures) {
            if (matchesMagicBytes(bytes, signature, offset)) {
                return { valid: true, detectedType: expectedMimeType };
            }
        }

        return {
            valid: false,
            error: 'File content does not match the declared file type',
        };
    } catch (error) {
        console.error('File validation error:', error);
        return {
            valid: false,
            error: 'Failed to validate file content',
        };
    }
}

/**
 * Validate file extension matches MIME type
 */
export function validateFileExtension(
    filename: string,
    mimeType: string
): FileValidationResult {
    const extension = getFileExtension(filename);

    if (!extension) {
        return {
            valid: false,
            error: 'File must have an extension',
        };
    }

    const allowedMimes = EXTENSION_TO_MIME[extension];

    if (!allowedMimes) {
        // Unknown extension, let storage service handle it
        return { valid: true };
    }

    if (!allowedMimes.includes(mimeType)) {
        return {
            valid: false,
            error: `File extension ${extension} does not match file type ${mimeType}`,
        };
    }

    return { valid: true };
}

/**
 * Complete file validation (extension + magic bytes)
 */
export async function validateFile(
    file: File
): Promise<FileValidationResult> {
    // First, validate extension matches MIME type
    const extensionResult = validateFileExtension(file.name, file.type);
    if (!extensionResult.valid) {
        return extensionResult;
    }

    // Then, validate magic bytes
    const magicResult = await validateFileMagicBytes(file, file.type);
    if (!magicResult.valid) {
        return magicResult;
    }

    return { valid: true };
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
    // Remove path separators and null bytes
    return filename
        .replace(/[\/\\]/g, '_')
        .replace(/\x00/g, '')
        .replace(/\.\./g, '_')
        .trim();
}
