"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, X, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface ImagePreviewProps {
    src: string
    alt: string
    isOpen: boolean
    onClose: () => void
}

export function ImagePreview({ src, alt, isOpen, onClose }: ImagePreviewProps) {
    const [zoom, setZoom] = useState(1)

    const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
    const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5))
    const resetZoom = () => setZoom(1)

    const handleDownload = () => {
        const link = document.createElement("a")
        link.href = src
        link.download = alt || "image"
        link.click()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
                <VisuallyHidden>
                    <DialogTitle>Preview Gambar: {alt}</DialogTitle>
                </VisuallyHidden>
                {/* Toolbar */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
                    <span className="text-white text-sm font-medium truncate max-w-[200px]">
                        {alt}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={zoomOut}
                        >
                            <ZoomOut className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/20 min-w-[60px]"
                            onClick={resetZoom}
                        >
                            {Math.round(zoom * 100)}%
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={zoomIn}
                        >
                            <ZoomIn className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={handleDownload}
                        >
                            <Download className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Image Container */}
                <div
                    className="flex items-center justify-center w-full h-[80vh] bg-black overflow-auto cursor-move"
                    onDoubleClick={resetZoom}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt={alt}
                        className={cn(
                            "max-w-none transition-transform duration-200",
                            "select-none"
                        )}
                        style={{ transform: `scale(${zoom})` }}
                        draggable={false}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Trigger component for easy integration
interface ImagePreviewTriggerProps {
    src: string
    alt: string
    className?: string
    children: React.ReactNode
}

export function ImagePreviewTrigger({ src, alt, className, children }: ImagePreviewTriggerProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <div
                className={cn("cursor-zoom-in", className)}
                onClick={() => setIsOpen(true)}
            >
                {children}
            </div>
            <ImagePreview
                src={src}
                alt={alt}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    )
}
