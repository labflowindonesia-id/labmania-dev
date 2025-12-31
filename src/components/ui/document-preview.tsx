"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Download, ExternalLink, FileText } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface DocumentPreviewProps {
    src: string
    title: string
    isOpen: boolean
    onClose: () => void
    type?: "pdf" | "image"
}

export function DocumentPreview({ src, title, isOpen, onClose, type = "pdf" }: DocumentPreviewProps) {
    const handleDownload = () => {
        const link = document.createElement("a")
        link.href = src
        link.download = title
        link.click()
    }

    const handleOpenInNewTab = () => {
        window.open(src, "_blank")
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
                <VisuallyHidden>
                    <DialogTitle>Preview Dokumen: {title}</DialogTitle>
                </VisuallyHidden>
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b bg-background">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[400px]">{title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenInNewTab}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Buka Tab Baru
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Document Container */}
                <div className="w-full h-[75vh] bg-muted">
                    {type === "pdf" ? (
                        <iframe
                            src={src}
                            className="w-full h-full border-0"
                            title={title}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={src}
                                alt={title}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Trigger component for easy integration
interface DocumentPreviewTriggerProps {
    src: string
    title: string
    type?: "pdf" | "image"
    children: React.ReactNode
}

export function DocumentPreviewTrigger({ src, title, type, children }: DocumentPreviewTriggerProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <div onClick={() => setIsOpen(true)} className="cursor-pointer">
                {children}
            </div>
            <DocumentPreview
                src={src}
                title={title}
                type={type}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    )
}
