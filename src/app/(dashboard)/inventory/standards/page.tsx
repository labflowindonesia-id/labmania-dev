"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Plus, Search, TestTubes, Eye, Edit, Trash2, Loader2, RefreshCw, Upload, X } from "lucide-react"
import { StockStatus } from "@/types"
import { useFetchPaginated, useMutation } from "@/hooks/use-api"
import { Pagination } from "@/components/ui/pagination"

interface Standard {
    id: string
    standardName: string
    casNumber: string | null
    chemicalFormula: string | null
    supplier: string | null
    sizeValue: string | null
    sizeUnit: string | null
    form: "solid" | "liquid" | "gas"
    storageLocation: "TC 1" | "TC 2" | "TC 3"
    currentStock: number
    minimumStockLevel: number
    status: StockStatus
    nearestExpDate: string | null
    productPhoto?: string | null
}

const statusConfig: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    available: { label: "Tersedia", variant: "default" },
    low_stock: { label: "Stok Menipis", variant: "secondary" },
    out_of_stock: { label: "Habis", variant: "outline" },
    expired: { label: "Expired", variant: "destructive" },
}

const initialFormData = {
    standardName: "",
    casNumber: "",
    chemicalFormula: "",
    supplier: "",
    sizeValue: "",
    sizeUnit: "ml",
    form: "liquid" as "solid" | "liquid" | "gas",
    storageLocation: "TC 1" as "TC 1" | "TC 2" | "TC 3",
    minimumStockLevel: 2,
    productPhoto: "",
}

export default function StandardsPage() {
    const router = useRouter()
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [editingStandard, setEditingStandard] = useState<Standard | null>(null)
    const [deletingStandard, setDeletingStandard] = useState<Standard | null>(null)

    // Form state
    const [formData, setFormData] = useState(initialFormData)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch standards from API with pagination
    const { data: standards, pagination, isLoading, error, refetch, search, setSearch, setPage } = useFetchPaginated<Standard>(
        "/api/inventory/standards",
        { status: statusFilter }
    )
    const displayStandards = standards || []

    // Create mutation
    const createMutation = useMutation<Standard, typeof formData>(
        "/api/inventory/standards",
        "POST",
        {
            onSuccess: () => {
                setIsAddDialogOpen(false)
                resetForm()
                refetch()
            }
        }
    )

    // Delete mutation
    const deleteMutation = useMutation<void, void>(
        "/api/inventory/standards",
        "DELETE",
        {
            onSuccess: () => {
                refetch()
            }
        }
    )

    const resetForm = () => {
        setFormData(initialFormData)
        setPhotoPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Preview
        const reader = new FileReader()
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Upload to Supabase
        setIsUploading(true)
        try {
            const formDataUpload = new FormData()
            formDataUpload.append("file", file)
            formDataUpload.append("bucket", "images")

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formDataUpload,
            })

            if (!response.ok) throw new Error("Upload gagal")
            const { publicUrl } = await response.json()
            setFormData((prev) => ({ ...prev, productPhoto: publicUrl }))
        } catch (err) {
            console.error("Upload error:", err)
        } finally {
            setIsUploading(false)
        }
    }

    const clearPhoto = () => {
        setPhotoPreview(null)
        setFormData((prev) => ({ ...prev, productPhoto: "" }))
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleSubmit = async () => {
        if (!formData.standardName || !formData.form || !formData.storageLocation) {
            return
        }
        await createMutation.mutate(formData)
    }

    const handleEdit = (e: React.MouseEvent, standard: Standard) => {
        e.stopPropagation()
        setEditingStandard(standard)
        setFormData({
            standardName: standard.standardName,
            casNumber: standard.casNumber || "",
            chemicalFormula: standard.chemicalFormula || "",
            supplier: standard.supplier || "",
            sizeValue: standard.sizeValue || "",
            sizeUnit: standard.sizeUnit || "ml",
            form: standard.form,
            storageLocation: standard.storageLocation,
            minimumStockLevel: standard.minimumStockLevel,
            productPhoto: standard.productPhoto || "",
        })
        setPhotoPreview(standard.productPhoto || null)
        setIsEditDialogOpen(true)
    }

    const handleUpdate = async () => {
        if (!editingStandard || !formData.standardName || !formData.form || !formData.storageLocation) {
            return
        }

        try {
            const response = await fetch(`/api/inventory/standards/${editingStandard.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })
            if (!response.ok) throw new Error("Gagal mengupdate standard")
            setIsEditDialogOpen(false)
            setEditingStandard(null)
            resetForm()
            refetch()
        } catch (err) {
            console.error(err)
        }
    }

    const handleDeleteClick = (e: React.MouseEvent, standard: Standard) => {
        e.stopPropagation()
        setDeletingStandard(standard)
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (!deletingStandard) return

        try {
            await fetch(`/api/inventory/standards/${deletingStandard.id}`, { method: "DELETE" })
            setIsDeleteDialogOpen(false)
            setDeletingStandard(null)
            refetch()
        } catch (err) {
            console.error(err)
        }
    }

    // Form fields JSX - inlined to prevent focus loss on re-render
    const formFieldsContent = (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nama Standard *</Label>
                    <Input
                        id="name"
                        placeholder="Contoh: Cu Standard 1000 ppm"
                        value={formData.standardName}
                        onChange={(e) => setFormData(prev => ({ ...prev, standardName: e.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cas">CAS Number</Label>
                    <Input
                        id="cas"
                        placeholder="Contoh: 7440-50-8"
                        value={formData.casNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, casNumber: e.target.value }))}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="formula">Rumus Kimia</Label>
                    <Input
                        id="formula"
                        placeholder="Contoh: Cu"
                        value={formData.chemicalFormula}
                        onChange={(e) => setFormData(prev => ({ ...prev, chemicalFormula: e.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                        id="supplier"
                        placeholder="Contoh: Merck"
                        value={formData.supplier}
                        onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    />
                </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="sizeValue">Ukuran</Label>
                    <Input
                        id="sizeValue"
                        type="number"
                        placeholder="100"
                        value={formData.sizeValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, sizeValue: e.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sizeUnit">Satuan</Label>
                    <Select
                        value={formData.sizeUnit}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, sizeUnit: value }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="g">gram</SelectItem>
                            <SelectItem value="L">Liter</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="form">Form *</Label>
                    <Select
                        value={formData.form}
                        onValueChange={(value: "solid" | "liquid" | "gas") => setFormData(prev => ({ ...prev, form: value }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="liquid">Liquid</SelectItem>
                            <SelectItem value="solid">Solid</SelectItem>
                            <SelectItem value="gas">Gas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="location">Lokasi *</Label>
                    <Select
                        value={formData.storageLocation}
                        onValueChange={(value: "TC 1" | "TC 2" | "TC 3") => setFormData(prev => ({ ...prev, storageLocation: value }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TC 1">TC 1</SelectItem>
                            <SelectItem value="TC 2">TC 2</SelectItem>
                            <SelectItem value="TC 3">TC 3</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="minStock">Stok Minimum</Label>
                <Input
                    id="minStock"
                    type="number"
                    value={formData.minimumStockLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumStockLevel: parseInt(e.target.value) || 0 }))}
                />
            </div>
            {/* Photo Upload */}
            <div className="space-y-2">
                <Label>Foto Produk</Label>
                <div className="flex items-center gap-4">
                    {photoPreview ? (
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6"
                                onClick={clearPhoto}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                            <TestTubes className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                    )}
                    <div>
                        <Input
                            ref={fileInputRef}
                            id="photo"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Foto
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
            {createMutation.error && (
                <p className="text-sm text-destructive">{createMutation.error}</p>
            )}
        </div>
    )

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Memuat data standards...</p>
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
                    <h1 className="text-3xl font-bold tracking-tight">Katalog Standard Stock</h1>
                    <p className="text-muted-foreground">
                        Kelola daftar larutan standar induk laboratorium
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm() }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Tambah Standard Stock Baru</DialogTitle>
                            <DialogDescription>
                                Masukkan informasi larutan standar yang akan ditambahkan ke katalog
                            </DialogDescription>
                        </DialogHeader>
                        {formFieldsContent}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm() }}>
                                Batal
                            </Button>
                            <Button onClick={handleSubmit} disabled={createMutation.isLoading || isUploading}>
                                {createMutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) { resetForm(); setEditingStandard(null) } }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Standard</DialogTitle>
                        <DialogDescription>
                            Ubah informasi standard stock
                        </DialogDescription>
                    </DialogHeader>
                    {formFieldsContent}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setEditingStandard(null) }}>
                            Batal
                        </Button>
                        <Button onClick={handleUpdate} disabled={isUploading}>
                            {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Standard?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Standard &quot;{deletingStandard?.standardName}&quot; akan dihapus secara permanen.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingStandard(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Cari standard atau CAS number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="available">Tersedia</SelectItem>
                        <SelectItem value="low_stock">Stok Menipis</SelectItem>
                        <SelectItem value="out_of_stock">Habis</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayStandards.map((standard) => (
                    <Card
                        key={standard.id}
                        className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
                        onClick={() => router.push(`/inventory/standards/${standard.id}`)}
                    >
                        {/* Image */}
                        <div className="aspect-square bg-muted flex items-center justify-center transition-colors hover:bg-muted/80 overflow-hidden">
                            {standard.productPhoto ? (
                                <img src={standard.productPhoto} alt={standard.standardName} className="w-full h-full object-cover" />
                            ) : (
                                <TestTubes className="h-16 w-16 text-muted-foreground/50" />
                            )}
                        </div>
                        <CardContent className="p-4">
                            <h3 className="font-semibold truncate">{standard.standardName}</h3>
                            <p className="text-sm text-muted-foreground">CAS: {standard.casNumber || "-"}</p>
                            <p className="text-sm text-muted-foreground">
                                {standard.chemicalFormula || "-"} • {standard.sizeValue || "-"} {standard.sizeUnit || ""}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                                <Badge variant={statusConfig[standard.status]?.variant || "secondary"}>
                                    {statusConfig[standard.status]?.label || standard.status}
                                </Badge>
                                <span className="text-sm">Stok: {standard.currentStock}</span>
                            </div>
                            {standard.nearestExpDate && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Exp: {new Date(standard.nearestExpDate).toLocaleDateString("id-ID")}
                                </p>
                            )}
                        </CardContent>
                        <CardFooter className="border-t p-2 flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/inventory/standards/${standard.id}`) }}>
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => handleEdit(e, standard)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => handleDeleteClick(e, standard)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {displayStandards.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <TestTubes className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Tidak ada standard stock ditemukan</p>
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Pagination
                    pagination={pagination}
                    onPageChange={setPage}
                />
            )}
        </div>
    )
}
