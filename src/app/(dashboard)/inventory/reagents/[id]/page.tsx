"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2, FlaskConical, MapPin, Package, Calendar, Building, Loader2 } from "lucide-react"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface ReagentDetail {
    id: string
    reagentName: string
    casNumber: string | null
    supplier: string | null
    storageLocation: string
    form: string
    minimumStockLevel: number
    currentStock: number
    nearestExpDate: string | null
    status: StockStatus
    msdsDocument?: string | null
    productPhoto?: string | null
}

interface WarehouseRecord {
    id: string
    receivedDate: string
    sizeValue: string
    sizeUnit: string
    lotNo?: string | null
    specification?: string | null
    receivedBy?: string | null
    receivedByUser?: { fullName: string } | null
}

const statusConfig: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    available: { label: "Tersedia", variant: "default" },
    low_stock: { label: "Stok Menipis", variant: "secondary" },
    out_of_stock: { label: "Habis", variant: "outline" },
    expired: { label: "Expired", variant: "destructive" },
}

export default function ReagentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const resolvedParams = use(params)
    const [reagent, setReagent] = useState<ReagentDetail | null>(null)
    const [warehouseRecords, setWarehouseRecords] = useState<WarehouseRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const fetchReagent = async () => {
            try {
                setIsLoading(true)
                const response = await fetch(`/api/inventory/reagents/${resolvedParams.id}`)
                if (!response.ok) {
                    if (response.status === 404) {
                        setError("Reagen tidak ditemukan")
                    } else {
                        setError("Gagal mengambil data reagen")
                    }
                    return
                }
                const data = await response.json()
                setReagent(data.reagent)
                setWarehouseRecords(data.warehouseRecords || [])
            } catch (err) {
                setError("Terjadi kesalahan saat mengambil data")
            } finally {
                setIsLoading(false)
            }
        }
        fetchReagent()
    }, [resolvedParams.id])

    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            const response = await fetch(`/api/inventory/reagents/${resolvedParams.id}`, {
                method: "DELETE",
            })
            if (response.ok) {
                router.push("/inventory/reagents")
            } else {
                setError("Gagal menghapus reagen")
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
                <p className="text-muted-foreground">Memuat data reagen...</p>
            </div>
        )
    }

    if (error || !reagent) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <FlaskConical className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">{error || "Reagen tidak ditemukan"}</h2>
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
                        <h1 className="text-3xl font-bold tracking-tight">{reagent.reagentName}</h1>
                        <p className="text-muted-foreground">CAS Number: {reagent.casNumber || "-"}</p>
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
                                <AlertDialogTitle>Hapus Reagen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tindakan ini tidak dapat dibatalkan. Reagen &quot;{reagent.reagentName}&quot; akan dihapus secara permanen.
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
                        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {reagent.productPhoto ? (
                                <img src={reagent.productPhoto} alt={reagent.reagentName} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <FlaskConical className="h-32 w-32 text-muted-foreground/30" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Informasi Reagen
                            <Badge variant={statusConfig[reagent.status]?.variant || "default"} className="text-sm">
                                {statusConfig[reagent.status]?.label || reagent.status}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4">
                            <div className="flex items-start gap-3">
                                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Supplier</p>
                                    <p className="font-medium">{reagent.supplier || "-"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Lokasi Penyimpanan</p>
                                    <p className="font-medium">{reagent.storageLocation}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Bentuk & Stok</p>
                                    <p className="font-medium capitalize">{reagent.form} • {reagent.currentStock} unit</p>
                                    <p className="text-xs text-muted-foreground">Minimum stok: {reagent.minimumStockLevel}</p>
                                </div>
                            </div>
                            {reagent.nearestExpDate && (
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tanggal Expired Terdekat</p>
                                        <p className="font-medium">{new Date(reagent.nearestExpDate).toLocaleDateString("id-ID", {
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

            {/* Riwayat Penerimaan Reagen */}
            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Penerimaan Reagen</CardTitle>
                </CardHeader>
                <CardContent>
                    {warehouseRecords.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal Terima</TableHead>
                                        <TableHead>Lot No</TableHead>
                                        <TableHead>Spesifikasi</TableHead>
                                        <TableHead className="text-center">Qty</TableHead>
                                        <TableHead>Diterima Oleh</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {warehouseRecords.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>{new Date(record.receivedDate).toLocaleDateString("id-ID")}</TableCell>
                                            <TableCell>{record.lotNo || "-"}</TableCell>
                                            <TableCell>{record.specification || "-"}</TableCell>
                                            <TableCell className="text-center font-medium">{record.sizeValue} {record.sizeUnit}</TableCell>
                                            <TableCell>{record.receivedBy || record.receivedByUser?.fullName || "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">Belum ada riwayat penerimaan reagen</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
