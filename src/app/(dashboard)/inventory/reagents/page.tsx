"use client"

import { useState, useEffect, useRef } from "react"
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
import { Plus, Search, FlaskConical, Eye, Edit, Trash2, Loader2, Upload, X, RefreshCw } from "lucide-react"
import { StockStatus } from "@/types"
import { useFetchPaginated } from "@/hooks/use-api"
import { Pagination } from "@/components/ui/pagination"

const statusConfig: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    available: { label: "Tersedia", variant: "default" },
    low_stock: { label: "Stok Menipis", variant: "secondary" },
    out_of_stock: { label: "Habis", variant: "outline" },
    expired: { label: "Expired", variant: "destructive" },
}

interface Reagent {
    id: string
    reagentName: string
    casNumber: string | null
    supplier: string | null
    storageLocation: string
    form: string
    currentStock: number
    minimumStockLevel: number
    status: StockStatus
    nearestExpDate?: string
    productPhoto?: string | null
}

const initialFormData = {
    reagentName: "",
    casNumber: "",
    supplier: "",
    storageLocation: "",
    form: "",
    minimumStockLevel: 0,
    productPhoto: "",
}

export default function ReagentsPage() {
    const router = useRouter()
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [editingReagent, setEditingReagent] = useState<Reagent | null>(null)
    const [deletingReagent, setDeletingReagent] = useState<Reagent | null>(null)

    // Form state
    const [formData, setFormData] = useState(initialFormData)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch reagents from API with pagination
    const { data: reagents, pagination, isLoading, error, refetch, search, setSearch, setPage } = useFetchPaginated<Reagent>(
        "/api/inventory/reagents",
        { status: statusFilter }
    )
    const displayReagents = reagents || []

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

    const handleAddReagent = async () => {
        if (!formData.reagentName || !formData.storageLocation || !formData.form) {
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/inventory/reagents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })
            if (!response.ok) throw new Error("Gagal menambah reagen")
            setIsAddDialogOpen(false)
            resetForm()
            refetch()
        } catch (err) {
            console.error(err)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEdit = (e: React.MouseEvent, reagent: Reagent) => {
        e.stopPropagation()
        setEditingReagent(reagent)
        setFormData({
            reagentName: reagent.reagentName,
            casNumber: reagent.casNumber || "",
            supplier: reagent.supplier || "",
            storageLocation: reagent.storageLocation,
            form: reagent.form,
            minimumStockLevel: reagent.minimumStockLevel,
            productPhoto: reagent.productPhoto || "",
        })
        setPhotoPreview(reagent.productPhoto || null)
        setIsEditDialogOpen(true)
    }

    const handleUpdate = async () => {
        if (!editingReagent || !formData.reagentName || !formData.storageLocation || !formData.form) {
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch(`/api/inventory/reagents/${editingReagent.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })
            if (!response.ok) throw new Error("Gagal mengupdate reagen")
            setIsEditDialogOpen(false)
            setEditingReagent(null)
            resetForm()
            refetch()
        } catch (err) {
            console.error(err)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteClick = (e: React.MouseEvent, reagent: Reagent) => {
        e.stopPropagation()
        setDeletingReagent(reagent)
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (!deletingReagent) return

        setIsSubmitting(true)
        try {
            const response = await fetch(`/api/inventory/reagents/${deletingReagent.id}`, {
                method: "DELETE",
            })
            if (!response.ok) throw new Error("Gagal menghapus reagen")
            setIsDeleteDialogOpen(false)
            setDeletingReagent(null)
            refetch()
        } catch (err) {
            console.error(err)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Form fields JSX - inlined to prevent focus loss on re-render
    const formFieldsContent = (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nama Reagen *</Label>
                    <Input
                        id="name"
                        placeholder="Contoh: Methanol HPLC Grade"
                        value={formData.reagentName}
                        onChange={(e) => setFormData({ ...formData, reagentName: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cas">CAS Number</Label>
                    <Input
                        id="cas"
                        placeholder="Contoh: 67-56-1"
                        value={formData.casNumber}
                        onChange={(e) => setFormData({ ...formData, casNumber: e.target.value })}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                        id="supplier"
                        placeholder="Contoh: Merck"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="location">Lokasi Penyimpanan *</Label>
                    <Select
                        value={formData.storageLocation}
                        onValueChange={(value) => setFormData({ ...formData, storageLocation: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih lokasi" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TC 1">TC 1</SelectItem>
                            <SelectItem value="TC 2">TC 2</SelectItem>
                            <SelectItem value="TC 3">TC 3</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="form">Bentuk *</Label>
                    <Select
                        value={formData.form}
                        onValueChange={(value) => setFormData({ ...formData, form: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih bentuk" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="solid">Solid</SelectItem>
                            <SelectItem value="liquid">Liquid</SelectItem>
                            <SelectItem value="gas">Gas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="minStock">Minimum Stok</Label>
                    <Input
                        id="minStock"
                        type="number"
                        placeholder="Contoh: 3"
                        value={formData.minimumStockLevel}
                        onChange={(e) => setFormData({ ...formData, minimumStockLevel: parseInt(e.target.value) || 0 })}
                    />
                </div>
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
                            <FlaskConical className="h-8 w-8 text-muted-foreground/50" />
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
        </div>
    )

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={refetch}>Coba Lagi</Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Katalog Reagen</h1>
                    <p className="text-muted-foreground">
                        Kelola daftar reagen dan bahan kimia laboratorium
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
                            <DialogTitle>Tambah Reagen Baru</DialogTitle>
                            <DialogDescription>
                                Masukkan informasi reagen yang akan ditambahkan ke katalog
                            </DialogDescription>
                        </DialogHeader>
                        {formFieldsContent}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm() }}>
                                Batal
                            </Button>
                            <Button onClick={handleAddReagent} disabled={isSubmitting || isUploading}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    "Simpan"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) { resetForm(); setEditingReagent(null) } }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Reagen</DialogTitle>
                        <DialogDescription>
                            Ubah informasi reagen
                        </DialogDescription>
                    </DialogHeader>
                    {formFieldsContent}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setEditingReagent(null) }}>
                            Batal
                        </Button>
                        <Button onClick={handleUpdate} disabled={isSubmitting || isUploading}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                "Simpan Perubahan"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Reagen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Reagen &quot;{deletingReagent?.reagentName}&quot; akan dihapus secara permanen.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingReagent(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Menghapus...
                                </>
                            ) : (
                                "Hapus"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Cari reagen atau CAS number..."
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
                <Select defaultValue="fefo">
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Urutkan" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="fefo">FEFO (Exp Terdekat)</SelectItem>
                        <SelectItem value="name">Nama A-Z</SelectItem>
                        <SelectItem value="stock">Stok Terendah</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayReagents.map((reagent) => (
                    <Card
                        key={reagent.id}
                        className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
                        onClick={() => router.push(`/inventory/reagents/${reagent.id}`)}
                    >
                        {/* Image */}
                        <div className="aspect-square bg-muted flex items-center justify-center transition-colors hover:bg-muted/80 overflow-hidden">
                            {reagent.productPhoto ? (
                                <img src={reagent.productPhoto} alt={reagent.reagentName} className="w-full h-full object-cover" />
                            ) : (
                                <FlaskConical className="h-16 w-16 text-muted-foreground/50" />
                            )}
                        </div>
                        <CardContent className="p-4">
                            <h3 className="font-semibold truncate">{reagent.reagentName}</h3>
                            <p className="text-sm text-muted-foreground">CAS: {reagent.casNumber || "-"}</p>
                            <div className="mt-2 flex items-center justify-between">
                                <Badge variant={statusConfig[reagent.status]?.variant || "default"}>
                                    {statusConfig[reagent.status]?.label || reagent.status}
                                </Badge>
                                <span className="text-sm">Stok: {reagent.currentStock ?? 0}</span>
                            </div>
                            {reagent.nearestExpDate && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Exp: {new Date(reagent.nearestExpDate).toLocaleDateString("id-ID")}
                                </p>
                            )}
                        </CardContent>
                        <CardFooter className="border-t p-2 flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/inventory/reagents/${reagent.id}`) }}>
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => handleEdit(e, reagent)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => handleDeleteClick(e, reagent)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {displayReagents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Tidak ada reagen ditemukan</p>
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
