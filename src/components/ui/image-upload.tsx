"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
    /**
     * Current image URL (for displaying existing image)
     */
    value?: string | null
    /**
     * Callback when image is selected/uploaded
     */
    onChange: (url: string | null, file?: File) => void
    /**
     * Whether to upload directly to API or just return file
     */
    uploadImmediately?: boolean
    /**
     * Upload endpoint (default: /api/upload)
     */
    uploadEndpoint?: string
    /**
     * Upload bucket name
     */
    bucket?: 'images' | 'documents' | 'calibration-reports' | 'maintenance-photos'
    /**
     * Maximum file size in MB (default: 5)
     */
    maxSizeMB?: number
    /**
     * Accepted file types
     */
    accept?: string
    /**
     * Placeholder text
     */
    placeholder?: string
    /**
     * Disabled state
     */
    disabled?: boolean
    /**
     * Custom className
     */
    className?: string
}

export function ImageUpload({
    value,
    onChange,
    uploadImmediately = false,
    uploadEndpoint = "/api/upload",
    bucket = "images",
    maxSizeMB = 5,
    accept = "image/*",
    placeholder = "Klik atau drag foto untuk upload",
    disabled = false,
    className,
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleFile = useCallback(async (file: File) => {
        setError(null)

        // Validate file size
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`Ukuran file maksimal ${maxSizeMB}MB`)
            return
        }

        // Create preview
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)

        if (uploadImmediately) {
            // Upload to server
            setIsUploading(true)
            try {
                const formData = new FormData()
                formData.append("file", file)
                formData.append("bucket", bucket)

                const response = await fetch(uploadEndpoint, {
                    method: "POST",
                    body: formData,
                })

                if (!response.ok) {
                    throw new Error("Upload gagal")
                }

                const data = await response.json()
                onChange(data.url, file)
            } catch (err) {
                setError("Gagal mengupload gambar")
                setPreviewUrl(null)
            } finally {
                setIsUploading(false)
            }
        } else {
            // Just return file without uploading
            onChange(objectUrl, file)
        }
    }, [maxSizeMB, uploadImmediately, bucket, uploadEndpoint, onChange])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFile(file)
        }
    }

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragOver(false)

        if (disabled) return

        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) {
            handleFile(file)
        }
    }, [disabled, handleFile])

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (!disabled) {
            setIsDragOver(true)
        }
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }

    const handleRemove = () => {
        setPreviewUrl(null)
        onChange(null)
        if (inputRef.current) {
            inputRef.current.value = ""
        }
    }

    const displayUrl = previewUrl || value

    return (
        <div className={cn("space-y-2", className)}>
            <div
                className={cn(
                    "relative border-2 border-dashed rounded-lg transition-colors",
                    isDragOver && "border-primary bg-primary/5",
                    !displayUrl && !disabled && "hover:border-primary hover:bg-muted/50 cursor-pointer",
                    disabled && "opacity-50 cursor-not-allowed",
                    error && "border-destructive"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !disabled && !displayUrl && inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    onChange={handleInputChange}
                    disabled={disabled}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                        <p className="text-sm text-muted-foreground">Mengupload...</p>
                    </div>
                ) : displayUrl ? (
                    <div className="relative aspect-video">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={displayUrl}
                            alt="Preview"
                            className="w-full h-full object-contain rounded-lg"
                        />
                        {!disabled && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemove()
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="p-3 bg-muted rounded-full mb-3">
                            {isDragOver ? (
                                <Upload className="h-8 w-8 text-primary" />
                            ) : (
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                            {placeholder}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Maks. {maxSizeMB}MB
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    )
}
