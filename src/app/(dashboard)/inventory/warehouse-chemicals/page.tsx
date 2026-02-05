"use client"

import { toast } from "sonner"
import { useState } from "react"
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
import { Plus, Search, Warehouse, Loader2, RefreshCw, Trash2, Pencil } from "lucide-react"
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
import { useCatalogItems } from "@/hooks/use-catalog-items"
import { Pagination } from "@/components/ui/pagination"
import { SearchableSelect } from "@/components/ui/searchable-select"

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
    totalPrice?: string | number | null
    unitCostBase?: string | number | null
    receivedBy?: string
    receivedByName?: string | null
    receivedByUser?: { fullName: string } | null
    status: WarehouseItemStatus
    daysUntilExpiry: number
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
    const [sortBy, setSortBy] = useState<string>("fefo")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editItem, setEditItem] = useState<WarehouseChemical | null>(null)
    const [isEditLoading, setIsEditLoading] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Edit form state
    const [editFormData, setEditFormData] = useState({
        sizeValue: "",
        sizeUnit: "ml",
        remainingAmount: "",
        unit: "ml",
        expiredDate: "",
        receivedByName: "",
        totalPrice: "",
    })

    // Form state
    const [formData, setFormData] = useState({
        catalogId: "",
        catalogType: "",
        name: "",
        amount: "",
        unit: "ml",
        expDate: "",
        receivedBy: "",
        totalPrice: "",
    })

    // Fetch catalogs with caching - reagents and standards
    const { items: reagentCatalog, isLoading: isLoadingReagents } = useCatalogItems(
        "/api/inventory/reagents",
        {
            transform: (data: unknown) => {
                const d = data as { data?: Array<{ id: string; reagentName: string }> }
                return (d.data || []).map(r => ({
                    id: r.id,
                    name: r.reagentName,
                    category: 'reagent',
                }))
            }
        }
    )

    const { items: standardCatalog, isLoading: isLoadingStandards } = useCatalogItems(
        "/api/inventory/standards",
        {
            transform: (data: unknown) => {
                const d = data as { data?: Array<{ id: string; standardName: string }> }
                return (d.data || []).map(s => ({
                    id: s.id,
                    name: s.standardName,
                    category: 'standard',
                }))
            }
        }
    )

    const { items: sampleCatalog, isLoading: isLoadingSamples } = useCatalogItems(
        "/api/inventory/samples",
        {
            transform: (data: unknown) => {
                const d = data as { data?: Array<{ id: string; sampleName: string }> }
                return (d.data || []).map(s => ({
                    id: s.id,
                    name: s.sampleName,
                    category: 'sample' as const,
                }))
            }
        }
    )

    // Combine catalogs
    const catalogItems = [...reagentCatalog, ...standardCatalog, ...sampleCatalog]
    const isLoadingCatalog = isLoadingReagents || isLoadingStandards || isLoadingSamples

    // Fetch warehouse chemicals from API with pagination
    const { data: chemicals, pagination, isLoading, error, refetch, search, setSearch, setPage } = useFetchPaginated<WarehouseChemical>(
        "/api/inventory/warehouse-chemicals",
        { status: statusFilter, catalogType: typeFilter, sortBy }
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
                setFormData({ catalogId: "", catalogType: "", name: "", amount: "", unit: "ml", expDate: "", receivedBy: "", totalPrice: "" })
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
                catalogType: selected.category,
                name: selected.name,
            })
        }
    }

    // Filter catalog items by type and convert to SearchableSelect options
    const catalogSelectOptions = (formData.catalogType
        ? catalogItems.filter(c => c.category === formData.catalogType)
        : catalogItems
    ).map(item => ({
        value: item.id,
        label: item.name,
        category: item.category,
    }))

    const handleSubmit = async () => {
        if (!formData.catalogId || !formData.amount || !formData.expDate) {
            return
        }
        // Calculate unitCostBase from totalPrice and amount
        const totalPrice = formData.totalPrice ? parseFloat(formData.totalPrice) : null;
        const amount = parseFloat(formData.amount);
        const unitCostBase = totalPrice && amount ? totalPrice / amount : null;

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
            totalPrice: totalPrice,
            unitCostBase: unitCostBase,
            receivedByName: formData.receivedBy,
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

    const handleEdit = (item: WarehouseChemical) => {
        setEditItem(item)
        setEditFormData({
            sizeValue: item.sizeValue || "",
            sizeUnit: item.sizeUnit || "ml",
            remainingAmount: item.remainingAmount || "",
            unit: item.unit || "ml",
            expiredDate: item.expiredDate || "",
            receivedByName: item.receivedByName || "",
            totalPrice: item.totalPrice?.toString() || "",
        })
        setIsEditDialogOpen(true)
    }

    const handleEditSubmit = async () => {
        if (!editItem) return

        setIsEditLoading(true)
        try {
            const response = await fetch(`/api/inventory/warehouse-chemicals/${editItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Gagal menyimpan')
            }

            toast.success('Item berhasil diperbarui')
            setIsEditDialogOpen(false)
            setEditItem(null)
            refetch()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
        } finally {
            setIsEditLoading(false)
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
                                            <SelectItem value="sample">Sample</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="catalogItem">Pilih Item Katalog</Label>
                                    <SearchableSelect
                                        options={catalogSelectOptions}
                                        value={formData.catalogId}
                                        onValueChange={handleCatalogSelect}
                                        placeholder={formData.catalogType ? "Pilih atau cari item..." : "Pilih tipe dulu"}
                                        searchPlaceholder="Ketik untuk mencari..."
                                        disabled={!formData.catalogType}
                                        isLoading={isLoadingCatalog}
                                    />
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
                            {/* Harga per Botol */}
                            <div className="space-y-2">
                                <Label htmlFor="totalPrice">Harga per Botol (Rp)</Label>
                                <Input
                                    id="totalPrice"
                                    type="number"
                                    placeholder="Contoh: 500000"
                                    value={formData.totalPrice}
                                    onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Harga satuan per botol/kemasan untuk perhitungan biaya training
                                    {formData.totalPrice && formData.amount && (
                                        <span className="ml-2 text-primary font-medium">
                                            (Rp {(parseFloat(formData.totalPrice) / parseFloat(formData.amount)).toFixed(2)}/{formData.unit})
                                        </span>
                                    )}
                                </p>
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
                        <SelectItem value="sample">Sample</SelectItem>
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
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Urutan" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="fefo">FEFO (Exp Terdekat)</SelectItem>
                        <SelectItem value="name">Nama A-Z</SelectItem>
                        <SelectItem value="newest">Terbaru Diterima</SelectItem>
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
                            <TableHead className="text-right">Harga</TableHead>
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
                                        : item.catalogType === "sample"
                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                            : "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
                                        }`}>
                                        {item.catalogType === "reagent" ? "Reagen" : item.catalogType === "sample" ? "Sample" : "Standard"}
                                    </span>
                                </TableCell>
                                <TableCell>{new Date(item.receivedDate).toLocaleDateString("id-ID")}</TableCell>
                                <TableCell className="text-right font-medium">
                                    {item.remainingAmount} {item.sizeUnit}
                                </TableCell>
                                <TableCell className="text-right">
                                    {item.sizeValue} {item.sizeUnit}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {item.totalPrice ? `Rp ${Number(item.totalPrice).toLocaleString('id-ID')}` : '-'}
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
                                    <div className="flex justify-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(item)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeleteId(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
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

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Item</DialogTitle>
                        <DialogDescription>
                            Edit data untuk {editItem?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ukuran Awal</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={editFormData.sizeValue}
                                        onChange={(e) => setEditFormData({ ...editFormData, sizeValue: e.target.value })}
                                    />
                                    <Select
                                        value={editFormData.sizeUnit}
                                        onValueChange={(value) => setEditFormData({ ...editFormData, sizeUnit: value })}
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
                                <Label>Sisa Jumlah</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={editFormData.remainingAmount}
                                        onChange={(e) => setEditFormData({ ...editFormData, remainingAmount: e.target.value })}
                                    />
                                    <Select
                                        value={editFormData.unit}
                                        onValueChange={(value) => setEditFormData({ ...editFormData, unit: value })}
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
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tanggal Expired</Label>
                                <Input
                                    type="date"
                                    value={editFormData.expiredDate}
                                    onChange={(e) => setEditFormData({ ...editFormData, expiredDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Diterima Oleh</Label>
                                <Select
                                    value={editFormData.receivedByName}
                                    onValueChange={(value) => setEditFormData({ ...editFormData, receivedByName: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih penerima" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {receivedByOptions.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Harga Per Botol (Rp)</Label>
                            <Input
                                type="number"
                                placeholder="100000"
                                value={editFormData.totalPrice}
                                onChange={(e) => setEditFormData({ ...editFormData, totalPrice: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleEditSubmit} disabled={isEditLoading}>
                            {isEditLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
