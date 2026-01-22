"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Plus, Search, Package, Loader2, RefreshCw, Trash2 } from "lucide-react"
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
import { ItemCategory } from "@/types"
import { useFetchPaginated, useMutation } from "@/hooks/use-api"
import { useCatalogItems } from "@/hooks/use-catalog-items"
import { Pagination } from "@/components/ui/pagination"
import { SearchableSelect } from "@/components/ui/searchable-select"

interface WarehouseItem {
    id: string
    catalogId: string
    name: string
    specification?: string | null
    lotNo?: string | null
    category: ItemCategory
    currentQuantity: number
    unit: string
    receivedDate: string
    receivedBy?: string
    receivedByName?: string | null
    receivedByUser?: { fullName: string } | null
}

interface CatalogItem {
    id: string
    name: string
    category: 'barang' | 'consumable'
}

const categoryConfig: Record<ItemCategory, { label: string; color: string }> = {
    barang: { label: "Barang", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    consumable: { label: "Consumable", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
}

// Static options for "Diterima Oleh" dropdown
const receivedByOptions = [
    { value: "GAP", label: "GAP" },
    { value: "KEP", label: "KEP" },
    { value: "Manager", label: "Manager" },
]

export default function WarehouseItemsPage() {
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        catalogId: "",
        name: "",
        specification: "",
        lotNo: "",
        category: "",
        quantity: "",
        unit: "pcs",
        receivedBy: "",
    })

    // Fetch catalogs with caching
    const { items: catalogItems, isLoading: isLoadingCatalog } = useCatalogItems(
        "/api/inventory/items",
        {
            transform: (data: unknown) => {
                const d = data as { data?: Array<{ id: string; name: string; category: string }> }
                return (d.data || []).map(i => ({
                    id: i.id,
                    name: i.name,
                    category: i.category,
                }))
            }
        }
    )

    // Fetch warehouse items from API with pagination
    const { data: items, pagination, isLoading, error, refetch, search, setSearch, setPage } = useFetchPaginated<WarehouseItem>(
        "/api/inventory/warehouse-items",
        { category: categoryFilter }
    )
    const displayItems = items || []

    // Create mutation
    const createItem = useMutation<WarehouseItem, object>(
        "/api/inventory/warehouse-items",
        "POST",
        {
            onSuccess: () => {
                refetch()
                setIsAddDialogOpen(false)
                setFormData({ catalogId: "", name: "", specification: "", lotNo: "", category: "", quantity: "", unit: "pcs", receivedBy: "" })
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
                name: selected.name,
                category: selected.category,
            })
        }
    }

    // Filter catalog items by category and convert to SearchableSelect options
    const catalogSelectOptions = (formData.category
        ? catalogItems.filter(c => c.category === formData.category)
        : catalogItems
    ).map(item => ({
        value: item.id,
        label: item.name,
        category: item.category,
    }))

    const handleSubmit = async () => {
        if (!formData.catalogId || !formData.quantity) {
            return
        }
        await createItem.mutate({
            catalogId: formData.catalogId,
            name: formData.name,
            specification: formData.specification || undefined,
            lotNo: formData.lotNo || undefined,
            category: formData.category,
            currentQuantity: parseInt(formData.quantity) || 0,
            unit: formData.unit,
            receivedDate: new Date().toISOString().split("T")[0],
            receivedByName: formData.receivedBy, // Store static value in text field
        })
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/inventory/warehouse-items/${deleteId}`, { method: "DELETE" })
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
                <span className="ml-2 text-muted-foreground">Memuat data warehouse items...</span>
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
                    <h1 className="text-3xl font-bold tracking-tight">Gudang Barang & Consumable</h1>
                    <p className="text-muted-foreground">
                        Detail stok peralatan dan bahan habis pakai
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
                                Masukkan informasi barang atau consumable yang diterima
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Kategori</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(value) => setFormData({ ...formData, category: value, catalogId: "", name: "" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="barang">Barang</SelectItem>
                                            <SelectItem value="consumable">Consumable</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="catalogItem">Pilih Item Katalog</Label>
                                    <SearchableSelect
                                        options={catalogSelectOptions}
                                        value={formData.catalogId}
                                        onValueChange={handleCatalogSelect}
                                        placeholder={formData.category ? "Pilih atau cari item..." : "Pilih kategori dulu"}
                                        searchPlaceholder="Ketik untuk mencari..."
                                        disabled={!formData.category}
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
                                    <Label htmlFor="specification">Spesifikasi</Label>
                                    <Input
                                        id="specification"
                                        placeholder="Contoh: Class A"
                                        value={formData.specification}
                                        onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lotNo">Lot Number</Label>
                                    <Input
                                        id="lotNo"
                                        placeholder="Contoh: LU-2024-001"
                                        value={formData.lotNo}
                                        onChange={(e) => setFormData({ ...formData, lotNo: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Jumlah</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="quantity"
                                            type="number"
                                            placeholder="10"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        />
                                        <Select
                                            value={formData.unit}
                                            onValueChange={(value) => setFormData({ ...formData, unit: value })}
                                        >
                                            <SelectTrigger className="w-24">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pcs">pcs</SelectItem>
                                                <SelectItem value="pack">pack</SelectItem>
                                                <SelectItem value="set">set</SelectItem>
                                                <SelectItem value="unit">unit</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={createItem.isLoading || !formData.catalogId || !formData.quantity}
                            >
                                {createItem.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                        placeholder="Cari nama atau lot number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        <SelectItem value="barang">Barang</SelectItem>
                        <SelectItem value="consumable">Consumable</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {/* Table - Action column removed */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Spesifikasi/Lot No</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead>Satuan</TableHead>
                            <TableHead>Tgl Terima</TableHead>
                            <TableHead>Diterima Oleh</TableHead>
                            <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                    {item.specification && <span>{item.specification}</span>}
                                    {item.lotNo && <span className="text-muted-foreground ml-2">({item.lotNo})</span>}
                                </TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryConfig[item.category].color}`}>
                                        {categoryConfig[item.category].label}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center font-medium">{item.currentQuantity}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>{new Date(item.receivedDate).toLocaleDateString("id-ID")}</TableCell>
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
                        <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
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
