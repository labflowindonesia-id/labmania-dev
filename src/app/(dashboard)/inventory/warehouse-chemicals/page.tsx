"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plus, Search, Warehouse, Loader2, RefreshCw, Trash2 } from "lucide-react"
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
import { WarehouseItemStatus } from "@/types"
import { useFetchPaginated, useMutation } from "@/hooks/use-api"
import { Pagination } from "@/components/ui/pagination"

interface WarehouseChemical {
    id: string
    catalogId: string
    catalogType: string
    name: string
    receivedDate: string
    sizeValue: string
    sizeUnit: string
    remainingAmount: string
    unit: string
    expiredDate: string
    receivedBy?: string
    receivedByName?: string | null
    receivedByUser?: { fullName: string } | null
    status: WarehouseItemStatus
    daysUntilExpiry: number
}

interface CatalogItem {
    id: string
    name: string
    type: 'reagent' | 'standard'
}

const statusConfig: Record<WarehouseItemStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    tersedia: { label: "Tersedia", variant: "default" },
    sedang_digunakan: { label: "Sedang Digunakan", variant: "secondary" },
    habis: { label: "Habis", variant: "outline" },
}

// Static options for "Diterima Oleh" dropdown
const receivedByOptions = [
    { value: "GAP", label: "GAP" },
    { value: "KEP", label: "KEP" },
    { value: "Manager", label: "Manager" },
]

export default function WarehouseChemicalsPage() {
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        catalogId: "",
        catalogType: "",
        name: "",
        amount: "",
        unit: "ml",
        expDate: "",
        receivedBy: "",
    })

    // Fetch catalogs on mount
    useEffect(() => {
        const fetchCatalogs = async () => {
            try {
                // Fetch reagents
                const reagentRes = await fetch("/api/inventory/reagents")
                const reagentData = await reagentRes.json()
                const reagents = (reagentData.reagents || []).map((r: { id: string; reagentName: string }) => ({
                    id: r.id,
                    name: r.reagentName,
                    type: 'reagent' as const,
                }))

                // Fetch standards
                const standardRes = await fetch("/api/inventory/standards")
                const standardData = await standardRes.json()
                const standards = (standardData.standards || []).map((s: { id: string; standardName: string }) => ({
                    id: s.id,
                    name: s.standardName,
                    type: 'standard' as const,
                }))

                setCatalogItems([...reagents, ...standards])
            } catch (error) {
                console.error("Error fetching catalogs:", error)
            }
        }
        fetchCatalogs()
    }, [])

    // Fetch warehouse chemicals from API with pagination
    const { data: chemicals, pagination, isLoading, error, refetch, search, setSearch, setPage } = useFetchPaginated<WarehouseChemical>(
        "/api/inventory/warehouse-chemicals",
        { status: statusFilter, catalogType: typeFilter }
    )
    const displayItems = chemicals || []

    // Create mutation
    const createChemical = useMutation<WarehouseChemical, object>(
        "/api/inventory/warehouse-chemicals",
        "POST",
        {
            onSuccess: () => {
                refetch()
                setIsAddDialogOpen(false)
                setFormData({ catalogId: "", catalogType: "", name: "", amount: "", unit: "ml", expDate: "", receivedBy: "" })
            },
        }
    )

    // Handle catalog selection
    const handleCatalogSelect = (catalogId: string) => {
        const selected = catalogItems.find(c => c.id === catalogId)
        if (selected) {
            setFormData({
                ...formData,
                catalogId: selected.id,
                catalogType: selected.type,
                name: selected.name,
            })
        }
    }

    // Filter catalog items by type
    const filteredCatalogItems = formData.catalogType
        ? catalogItems.filter(c => c.type === formData.catalogType)
        : catalogItems

    const handleSubmit = async () => {
        if (!formData.catalogId || !formData.amount || !formData.expDate) {
            return
        }
        await createChemical.mutate({
            catalogId: formData.catalogId,
            catalogType: formData.catalogType,
            name: formData.name,
            receivedDate: new Date().toISOString().split("T")[0],
            sizeValue: formData.amount,
            sizeUnit: formData.unit,
            remainingAmount: formData.amount,
            unit: formData.unit,
            expiredDate: formData.expDate,
            receivedByName: formData.receivedBy, // Store static value in text field
            status: "tersedia",
        })
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/inventory/warehouse-chemicals/${deleteId}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Gagal menghapus")
            refetch()
        } catch (err) {
            console.error(err)
        } finally {
            setIsDeleting(false)
            setDeleteId(null)
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Memuat data warehouse chemicals...</span>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Coba Lagi
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gudang Reagen & Standar</h1>
                    <p className="text-muted-foreground">
                        Detail stok per batch reagen dan larutan standar
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Terima Barang Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Terima Barang Baru</DialogTitle>
                            <DialogDescription>
                                Masukkan informasi batch baru yang diterima
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="catalogType">Tipe Katalog</Label>
                                    <Select
                                        value={formData.catalogType}
                                        onValueChange={(value) => setFormData({ ...formData, catalogType: value, catalogId: "", name: "" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih tipe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="reagent">Reagen</SelectItem>
                                            <SelectItem value="standard">Standard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="catalogItem">Pilih Item Katalog</Label>
                                    <Select
                                        value={formData.catalogId}
                                        onValueChange={handleCatalogSelect}
                                        disabled={!formData.catalogType}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={formData.catalogType ? "Pilih item" : "Pilih tipe dulu"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredCatalogItems.length === 0 ? (
                                                <div className="py-6 text-center text-sm text-muted-foreground">
                                                    Tidak ada item
                                                </div>
                                            ) : (
                                                filteredCatalogItems.map((item) => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {formData.name && (
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground">Item terpilih:</p>
                                    <p className="font-medium">{formData.name}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Jumlah</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="amount"
                                            type="number"
                                            placeholder="2500"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                        <Select
                                            value={formData.unit}
                                            onValueChange={(value) => setFormData({ ...formData, unit: value })}
                                        >
                                            <SelectTrigger className="w-20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ml">ml</SelectItem>
                                                <SelectItem value="L">L</SelectItem>
                                                <SelectItem value="g">g</SelectItem>
                                                <SelectItem value="kg">kg</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="expDate">Tanggal Expired</Label>
                                    <Input
                                        id="expDate"
                                        type="date"
                                        value={formData.expDate}
                                        onChange={(e) => setFormData({ ...formData, expDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            {/* Diterima Oleh Dropdown */}
                            <div className="space-y-2">
                                <Label htmlFor="receivedBy">Diterima Oleh</Label>
                                <Select
                                    value={formData.receivedBy}
                                    onValueChange={(value) => setFormData({ ...formData, receivedBy: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih penerima" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {receivedByOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={createChemical.isLoading || !formData.catalogId || !formData.amount || !formData.expDate}
                            >
                                {createChemical.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Cari nama item..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        <SelectItem value="reagent">Reagen</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="tersedia">Tersedia</SelectItem>
                        <SelectItem value="sedang_digunakan">Sedang Digunakan</SelectItem>
                        <SelectItem value="habis">Habis</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Tgl Terima</TableHead>
                            <TableHead className="text-right">Sisa</TableHead>
                            <TableHead className="text-right">Ukuran</TableHead>
                            <TableHead>Tgl Expired</TableHead>
                            <TableHead className="text-center">Hari</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Diterima Oleh</TableHead>
                            <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.catalogType === "reagent"
                                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                        : "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
                                        }`}>
                                        {item.catalogType === "reagent" ? "Reagen" : "Standard"}
                                    </span>
                                </TableCell>
                                <TableCell>{new Date(item.receivedDate).toLocaleDateString("id-ID")}</TableCell>
                                <TableCell className="text-right font-medium">
                                    {item.remainingAmount} {item.sizeUnit}
                                </TableCell>
                                <TableCell className="text-right">
                                    {item.sizeValue} {item.sizeUnit}
                                </TableCell>
                                <TableCell>{new Date(item.expiredDate).toLocaleDateString("id-ID")}</TableCell>
                                <TableCell className={`text-center font-medium ${item.daysUntilExpiry < 0 ? "text-red-600" :
                                    item.daysUntilExpiry < 30 ? "text-yellow-600" : ""
                                    }`}>
                                    {item.daysUntilExpiry < 0 ? `${Math.abs(item.daysUntilExpiry)} hari lalu` : `${item.daysUntilExpiry} hari`}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={statusConfig[item.status].variant}>
                                        {statusConfig[item.status].label}
                                    </Badge>
                                </TableCell>
                                <TableCell>{item.receivedByName || item.receivedByUser?.fullName || "-"}</TableCell>
                                <TableCell className="text-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setDeleteId(item.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {
                displayItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Warehouse className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Tidak ada item ditemukan</p>
                    </div>
                )
            }

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Pagination
                    pagination={pagination}
                    onPageChange={setPage}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Item?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus item ini dari gudang? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
