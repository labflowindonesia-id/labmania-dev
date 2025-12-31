"use client"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Trash2, CheckCircle2, XCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type DialogVariant = "default" | "destructive" | "success" | "warning" | "info"

interface ConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: DialogVariant
    isLoading?: boolean
}

const variantConfig: Record<DialogVariant, {
    icon: typeof AlertTriangle
    iconColor: string
    buttonClass: string
}> = {
    default: {
        icon: Info,
        iconColor: "text-blue-500",
        buttonClass: "",
    },
    destructive: {
        icon: Trash2,
        iconColor: "text-red-500",
        buttonClass: "bg-red-600 hover:bg-red-700",
    },
    success: {
        icon: CheckCircle2,
        iconColor: "text-green-500",
        buttonClass: "bg-green-600 hover:bg-green-700",
    },
    warning: {
        icon: AlertTriangle,
        iconColor: "text-yellow-500",
        buttonClass: "bg-yellow-600 hover:bg-yellow-700",
    },
    info: {
        icon: Info,
        iconColor: "text-blue-500",
        buttonClass: "",
    },
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Konfirmasi",
    cancelText = "Batal",
    variant = "default",
    isLoading = false,
}: ConfirmDialogProps) {
    const config = variantConfig[variant]
    const Icon = config.icon

    const handleConfirm = () => {
        onConfirm()
        if (!isLoading) {
            onClose()
        }
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-full bg-muted", config.iconColor)}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="pt-2">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={cn(config.buttonClass)}
                    >
                        {isLoading ? "Memproses..." : confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

// Delete Confirmation shorthand
interface DeleteConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    itemName: string
    isLoading?: boolean
}

export function DeleteConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    isLoading,
}: DeleteConfirmDialogProps) {
    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Hapus Item"
            description={`Apakah Anda yakin ingin menghapus "${itemName}"? Tindakan ini tidak dapat dibatalkan.`}
            confirmText="Hapus"
            cancelText="Batal"
            variant="destructive"
            isLoading={isLoading}
        />
    )
}

// Approve/Reject Confirmation shorthand
interface ApprovalConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    action: "approve" | "reject"
    itemName: string
    isLoading?: boolean
}

export function ApprovalConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    action,
    itemName,
    isLoading,
}: ApprovalConfirmDialogProps) {
    const isApprove = action === "approve"

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
            title={isApprove ? "Setujui Pesanan" : "Tolak Pesanan"}
            description={
                isApprove
                    ? `Apakah Anda yakin ingin menyetujui "${itemName}"?`
                    : `Apakah Anda yakin ingin menolak "${itemName}"? Mohon pastikan alasan penolakan sudah dikomunikasikan.`
            }
            confirmText={isApprove ? "Setujui" : "Tolak"}
            cancelText="Batal"
            variant={isApprove ? "success" : "destructive"}
            isLoading={isLoading}
        />
    )
}
