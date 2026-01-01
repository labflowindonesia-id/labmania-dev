"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2, Package, MapPin, Box, Tag, Loader2 } from "lucide-react"
import { StockStatus, ItemCategory } from "@/types"
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

interface ItemDetail {
    id: string
    name: string
    brand: string | null
    category: ItemCategory
    stockUnit: string
    minimumStockLevel: number
    location: string | null
    currentQuantity: number
    status: StockStatus
    productPhoto?: string | null
    createdAt: string
    updatedAt: string
}

interface WarehouseRecord {
    id: string
    receivedDate: string
    currentQuantity: number
    lotNo: string | null
    specification: string | null
    receivedByUser: { fullName: string } | null
}

const statusConfig: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    available: { label: "Tersedia", variant: "default" },
    low_stock: { label: "Stok Menipis", variant: "secondary" },
    out_of_stock: { label: "Habis", variant: "outline" },
    expired: { label: "Expired", variant: "destructive" },
}

const categoryConfig: Record<ItemCategory, { label: string; color: string }> = {
    barang: { label: "Barang", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    consumable: { label: "Consumable", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const resolvedParams = use(params)
    const [item, setItem] = useState<ItemDetail | null>(null)
    const [warehouseRecords, setWarehouseRecords] = useState<WarehouseRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const fetchItem = async () => {
            try {
                setIsLoading(true)
                const response = await fetch(`/api/inventory/items/${resolvedParams.id}`)
                if (!response.ok) {
                    if (response.status === 404) {
                        setError("Item tidak ditemukan")
                    } else {
                        setError("Gagal mengambil data item")
                    }
                    return
                }
                const data = await response.json()
                setItem(data.item)
                setWarehouseRecords(data.warehouseRecords || [])
            } catch (err) {
                setError("Terjadi kesalahan saat mengambil data")
            } finally {
                setIsLoading(false)
            }
        }
        fetchItem()
    }, [resolvedParams.id])

    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            const response = await fetch(`/api/inventory/items/${resolvedParams.id}`, {
                method: "DELETE",
            })
            if (response.ok) {
                router.push("/inventory/items")
            } else {
                setError("Gagal menghapus item")
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
                <p className="text-muted-foreground">Memuat data item...</p>
            </div>
        )
    }

    if (error || !item) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">{error || "Item tidak ditemukan"}</h2>
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
                        <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
                        <p className="text-muted-foreground">
                            {item.brand || "Tidak ada merek"} • {categoryConfig[item.category]?.label || item.category}
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
                                <AlertDialogTitle>Hapus Item?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tindakan ini tidak dapat dibatalkan. Item &quot;{item.name}&quot; akan dihapus secara permanen.
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
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Informasi Item
                        <Badge variant={statusConfig[item.status]?.variant || "default"} className="text-sm">
                            {statusConfig[item.status]?.label || item.status}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="flex items-start gap-3">
                            <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm text-muted-foreground">Kategori</p>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryConfig[item.category]?.color}`}>
                                    {categoryConfig[item.category]?.label || item.category}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm text-muted-foreground">Lokasi Penyimpanan</p>
                                <p className="font-medium">{item.location || "-"}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Box className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm text-muted-foreground">Stok Saat Ini</p>
                                <p className="font-medium">{item.currentQuantity} {item.stockUnit}</p>
                                <p className="text-xs text-muted-foreground">Minimum stok: {item.minimumStockLevel} {item.stockUnit}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Warehouse History */}
            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Penerimaan Barang</CardTitle>
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
                                            <TableCell className="text-center font-medium">{record.currentQuantity}</TableCell>
                                            <TableCell>{record.receivedByUser?.fullName || "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">Belum ada riwayat penerimaan barang</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
