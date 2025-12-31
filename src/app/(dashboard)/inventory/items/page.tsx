"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, Package, Eye, Edit, Trash2, Loader2, RefreshCw } from "lucide-react"
import { StockStatus, ItemCategory } from "@/types"
import { useFetch, useMutation } from "@/hooks/use-api"

interface Item {
    id: string
    name: string
    brand: string | null
    category: ItemCategory
    stockUnit: string
    minimumStockLevel: number
    location: string | null
    currentQuantity: number
    status: StockStatus
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

export default function ItemsPage() {
    const router = useRouter()
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<Item | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        brand: "",
        category: "barang" as ItemCategory,
        stockUnit: "pcs",
        minimumStockLevel: 10,
        location: "TC 1",
    })

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: "",
        brand: "",
        category: "barang" as ItemCategory,
        stockUnit: "pcs",
        minimumStockLevel: 10,
        location: "",
    })

    // Fetch items from API
    const { data, isLoading, error, refetch } = useFetch<{ items: Item[] }>("/api/inventory/items")

    // Create mutation
    const createMutation = useMutation<Item, typeof formData>(
        "/api/inventory/items",
        "POST",
        {
            onSuccess: () => {
                setIsAddDialogOpen(false)
                setFormData({
                    name: "",
                    brand: "",
                    category: "barang",
                    stockUnit: "pcs",
                    minimumStockLevel: 10,
                    location: "TC 1",
                })
                refetch()
            }
        }
    )

    // Update mutation
    const updateMutation = useMutation<Item, typeof editForm>(
        `/api/inventory/items/${selectedItem?.id}`,
        "PUT",
        {
            onSuccess: () => {
                setIsEditDialogOpen(false)
                setSelectedItem(null)
                refetch()
            }
        }
    )

    const handleSubmit = async () => {
        if (!formData.name || !formData.category || !formData.stockUnit) {
            return
        }
        await createMutation.mutate(formData)
    }

    const handleEdit = (item: Item) => {
        setSelectedItem(item)
        setEditForm({
            name: item.name,
            brand: item.brand || "",
            category: item.category,
            stockUnit: item.stockUnit,
            minimumStockLevel: item.minimumStockLevel,
            location: item.location || "",
        })
        setIsEditDialogOpen(true)
    }

    const handleUpdate = async () => {
        if (!editForm.name) return
        await updateMutation.mutate(editForm)
    }

    const handleDelete = async (id: string) => {
        if (confirm("Yakin ingin menghapus item ini?")) {
            await fetch(`/api/inventory/items/${id}`, { method: "DELETE" })
            refetch()
        }
    }

    const items = data?.items || []

    const filteredItems = items.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
            (item.brand?.toLowerCase().includes(search.toLowerCase()) ?? false)
        const matchesStatus = statusFilter === "all" || item.status === statusFilter
        const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
        return matchesSearch && matchesStatus && matchesCategory
    })

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Memuat data items...</p>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={refetch} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
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
                    <h1 className="text-3xl font-bold tracking-tight">Katalog Barang & Consumable</h1>
                    <p className="text-muted-foreground">
                        Kelola daftar peralatan dan bahan habis pakai laboratorium
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Tambah Barang/Consumable Baru</DialogTitle>
                            <DialogDescription>
                                Masukkan informasi item yang akan ditambahkan ke katalog
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nama Barang *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Contoh: Labu Ukur 100 ml"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brand">Merek/Spesifikasi</Label>
                                    <Input
                                        id="brand"
                                        placeholder="Contoh: Pyrex"
                                        value={formData.brand}
                                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Kategori *</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(value: ItemCategory) => setFormData(prev => ({ ...prev, category: value }))}
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
                                    <Label htmlFor="unit">Satuan Stok *</Label>
                                    <Select
                                        value={formData.stockUnit}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, stockUnit: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih satuan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unit">Unit</SelectItem>
                                            <SelectItem value="pack">Pack</SelectItem>
                                            <SelectItem value="pcs">Pcs</SelectItem>
                                            <SelectItem value="set">Set</SelectItem>
                                            <SelectItem value="roll">Roll</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="minStock">Minimum Stok</Label>
                                    <Input
                                        id="minStock"
                                        type="number"
                                        value={formData.minimumStockLevel}
                                        onChange={(e) => setFormData(prev => ({ ...prev, minimumStockLevel: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Lokasi</Label>
                                <Input
                                    id="location"
                                    placeholder="Contoh: TC 1"
                                    value={formData.location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                />
                            </div>
                            {createMutation.error && (
                                <p className="text-sm text-destructive">{createMutation.error}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button onClick={handleSubmit} disabled={createMutation.isLoading}>
                                {createMutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
                        placeholder="Cari nama atau merek..."
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="available">Tersedia</SelectItem>
                        <SelectItem value="low_stock">Stok Menipis</SelectItem>
                        <SelectItem value="out_of_stock">Habis</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Merek</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Lokasi</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-center">Min. Stok</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.brand || "-"}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryConfig[item.category]?.color || ""}`}>
                                        {categoryConfig[item.category]?.label || item.category}
                                    </span>
                                </TableCell>
                                <TableCell>{item.location || "-"}</TableCell>
                                <TableCell className="text-center">
                                    {item.currentQuantity} {item.stockUnit}
                                </TableCell>
                                <TableCell className="text-center">{item.minimumStockLevel}</TableCell>
                                <TableCell>
                                    <Badge variant={statusConfig[item.status]?.variant || "secondary"}>
                                        {statusConfig[item.status]?.label || item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => router.push(`/inventory/items/${item.id}`)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive"
                                            onClick={() => handleDelete(item.id)}
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

            {filteredItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Tidak ada item ditemukan</p>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Item</DialogTitle>
                        <DialogDescription>
                            Ubah informasi item katalog
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nama Item *</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-brand">Brand/Merk</Label>
                                <Input
                                    id="edit-brand"
                                    value={editForm.brand}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, brand: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">Kategori</Label>
                                <Select
                                    value={editForm.category}
                                    onValueChange={(value: ItemCategory) => setEditForm(prev => ({ ...prev, category: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="barang">Barang (Alat)</SelectItem>
                                        <SelectItem value="consumable">Consumable (Habis Pakai)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-unit">Satuan</Label>
                                <Select
                                    value={editForm.stockUnit}
                                    onValueChange={(value) => setEditForm(prev => ({ ...prev, stockUnit: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih satuan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pcs">pcs</SelectItem>
                                        <SelectItem value="box">box</SelectItem>
                                        <SelectItem value="pack">pack</SelectItem>
                                        <SelectItem value="set">set</SelectItem>
                                        <SelectItem value="roll">roll</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-minstock">Stok Minimum</Label>
                                <Input
                                    id="edit-minstock"
                                    type="number"
                                    value={editForm.minimumStockLevel}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, minimumStockLevel: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-location">Lokasi Penyimpanan</Label>
                                <Input
                                    id="edit-location"
                                    value={editForm.location}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                                />
                            </div>
                        </div>
                        {updateMutation.error && (
                            <p className="text-sm text-destructive">{updateMutation.error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isLoading}>
                            {updateMutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
