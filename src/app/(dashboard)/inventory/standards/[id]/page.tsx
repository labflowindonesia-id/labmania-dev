"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2, TestTubes, MapPin, Package, Calendar, Building, Beaker, Loader2 } from "lucide-react"
import { StockStatus } from "@/types"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface StandardDetail {
    id: string
    standardName: string
    casNumber: string | null
    chemicalFormula: string | null
    supplier: string | null
    sizeValue: number | null
    sizeUnit: string | null
    form: string
    storageLocation: string
    minimumStockLevel: number
    currentStock: number
    nearestExpDate: string | null
    status: StockStatus
    msdsDocument?: string | null
    photo?: string | null
}

const statusConfig: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    available: { label: "Tersedia", variant: "default" },
    low_stock: { label: "Stok Menipis", variant: "secondary" },
    out_of_stock: { label: "Habis", variant: "outline" },
    expired: { label: "Expired", variant: "destructive" },
}

export default function StandardDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const resolvedParams = use(params)
    const [standard, setStandard] = useState<StandardDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const fetchStandard = async () => {
            try {
                setIsLoading(true)
                const response = await fetch(`/api/inventory/standards/${resolvedParams.id}`)
                if (!response.ok) {
                    if (response.status === 404) {
                        setError("Standard tidak ditemukan")
                    } else {
                        setError("Gagal mengambil data standard")
                    }
                    return
                }
                const data = await response.json()
                setStandard(data.standard)
            } catch (err) {
                setError("Terjadi kesalahan saat mengambil data")
            } finally {
                setIsLoading(false)
            }
        }
        fetchStandard()
    }, [resolvedParams.id])

    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            const response = await fetch(`/api/inventory/standards/${resolvedParams.id}`, {
                method: "DELETE",
            })
            if (response.ok) {
                router.push("/inventory/standards")
            } else {
                setError("Gagal menghapus standard")
            }
        } catch (err) {
            setError("Terjadi kesalahan saat menghapus")
        } finally {
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Memuat data standard...</p>
            </div>
        )
    }

    if (error || !standard) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <TestTubes className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">{error || "Standard tidak ditemukan"}</h2>
                <p className="text-muted-foreground mb-4">ID: {resolvedParams.id}</p>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Kembali
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{standard.standardName}</h1>
                        <p className="text-muted-foreground">
                            {standard.chemicalFormula && <span className="mr-2">{standard.chemicalFormula}</span>}
                            {standard.casNumber && <span>CAS: {standard.casNumber}</span>}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isDeleting}>
                                {isDeleting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Hapus
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Standard?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tindakan ini tidak dapat dibatalkan. Standard "{standard.standardName}" akan dihapus secara permanen.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Hapus
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Content */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Image Card */}
                <Card>
                    <CardContent className="p-6">
                        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                            {standard.photo ? (
                                <img src={standard.photo} alt={standard.standardName} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <TestTubes className="h-32 w-32 text-muted-foreground/30" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Informasi Standard
                            <Badge variant={statusConfig[standard.status]?.variant || "default"} className="text-sm">
                                {statusConfig[standard.status]?.label || standard.status}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4">
                            <div className="flex items-start gap-3">
                                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Supplier</p>
                                    <p className="font-medium">{standard.supplier || "-"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Lokasi Penyimpanan</p>
                                    <p className="font-medium">{standard.storageLocation}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Beaker className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Ukuran & Bentuk</p>
                                    <p className="font-medium capitalize">
                                        {standard.sizeValue && standard.sizeUnit
                                            ? `${standard.sizeValue} ${standard.sizeUnit}`
                                            : "-"} • {standard.form}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Stok</p>
                                    <p className="font-medium">{standard.currentStock} unit</p>
                                    <p className="text-xs text-muted-foreground">Minimum stok: {standard.minimumStockLevel}</p>
                                </div>
                            </div>
                            {standard.nearestExpDate && (
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tanggal Expired Terdekat</p>
                                        <p className="font-medium">{new Date(standard.nearestExpDate).toLocaleDateString("id-ID", {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
