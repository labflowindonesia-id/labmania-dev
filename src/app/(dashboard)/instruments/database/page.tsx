"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Plus, Search, Microscope, ChevronDown, Trash2, Calendar, Eye, Loader2, RefreshCw, Image, X } from "lucide-react"
import { InstrumentStatus, AssetType } from "@/types"
import { useFetchPaginated, useMutation } from "@/hooks/use-api"
import { Pagination } from "@/components/ui/pagination"

interface Instrument {
    id: string
    name: string
    brand: string | null
    model: string | null
    calibrationVendor: string | null
    calibrationInterval: number
    lastCalibrationDate: string | null
    nextCalibrationDate: string | null
    daysUntilDue: number
    status: InstrumentStatus
    scheduleStatus: string
    assetType: AssetType
    location: string
    picName?: string | null
    picUser?: { fullName: string }
    photo?: string | null
    photoUrl?: string | null
}

const statusConfig: Record<InstrumentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    terkalibrasi: { label: "Terkalibrasi", variant: "default" },
    jadwal_mendatang: { label: "Jadwal Mendatang", variant: "secondary" },
    lewat_jatuh_tempo: { label: "Lewat Jatuh Tempo", variant: "destructive" },
    dalam_perbaikan: { label: "Dalam Perbaikan", variant: "outline" },
}

export default function InstrumentDatabasePage() {
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [openItems, setOpenItems] = useState<string[]>([])
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        brand: "",
        model: "",
        calibrationVendor: "",
        calibrationInterval: 12,
        assetType: "instrumen" as AssetType,
        location: "TC 1",
        photo: "",
    })
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Handle photo upload
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Show preview immediately
        const reader = new FileReader()
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Upload to server
        setIsUploading(true)
        try {
            const formDataUpload = new FormData()
            formDataUpload.append("file", file)
            formDataUpload.append("bucket", "images")

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formDataUpload,
            })

            if (response.ok) {
                const { publicUrl } = await response.json()
                setFormData((prev) => ({ ...prev, photo: publicUrl }))
            }
        } catch (error) {
            console.error("Upload error:", error)
        } finally {
            setIsUploading(false)
        }
    }

    const removePhoto = () => {
        setPhotoPreview(null)
        setFormData((prev) => ({ ...prev, photo: "" }))
    }

    // Fetch instruments from API with pagination
    const { data: instruments, pagination, isLoading, error, refetch, search, setSearch, setPage } = useFetchPaginated<Instrument>(
        "/api/instruments",
        { status: statusFilter, type: typeFilter }
    )
    const displayInstruments = instruments || []

    // Create mutation
    const createMutation = useMutation<Instrument, typeof formData>(
        "/api/instruments",
        "POST",
        {
            onSuccess: () => {
                setIsAddDialogOpen(false)
                setFormData({
                    name: "",
                    brand: "",
                    model: "",
                    calibrationVendor: "",
                    calibrationInterval: 12,
                    assetType: "instrumen",
                    location: "TC 1",
                    photo: "",
                })
                setPhotoPreview(null)
                refetch()
            }
        }
    )

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleSubmit = async () => {
        if (!formData.name || !formData.assetType || !formData.location) {
            return
        }
        await createMutation.mutate(formData)
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/instruments/${deleteId}`, { method: "DELETE" })
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
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Memuat data instrumen...</p>
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
                    <h1 className="text-3xl font-bold tracking-tight">Database Instrumen</h1>
                    <p className="text-muted-foreground">
                        Kelola data instrumen dan jadwal kalibrasi
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Instrumen
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Tambah Instrumen Baru</DialogTitle>
                            <DialogDescription>
                                Masukkan informasi instrumen atau peralatan
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nama Alat *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Contoh: HPLC Agilent 1260"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brand">Merek</Label>
                                    <Input
                                        id="brand"
                                        placeholder="Contoh: Agilent"
                                        value={formData.brand}
                                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="model">Model</Label>
                                    <Input
                                        id="model"
                                        placeholder="Contoh: 1260 Infinity II"
                                        value={formData.model}
                                        onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vendor">Vendor Kalibrasi</Label>
                                    <Input
                                        id="vendor"
                                        placeholder="Contoh: PT Kalibra Indo"
                                        value={formData.calibrationVendor}
                                        onChange={(e) => setFormData(prev => ({ ...prev, calibrationVendor: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="interval">Interval Kalibrasi (bulan)</Label>
                                    <Input
                                        id="interval"
                                        type="number"
                                        value={formData.calibrationInterval}
                                        onChange={(e) => setFormData(prev => ({ ...prev, calibrationInterval: parseInt(e.target.value) || 12 }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipe Aset *</Label>
                                    <Select
                                        value={formData.assetType}
                                        onValueChange={(value: AssetType) => setFormData(prev => ({ ...prev, assetType: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih tipe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="instrumen">Instrumen</SelectItem>
                                            <SelectItem value="peralatan">Peralatan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Lokasi *</Label>
                                <Select
                                    value={formData.location}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
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
                            {/* Photo Upload */}
                            <div className="space-y-2">
                                <Label>Foto Instrumen</Label>
                                <div className="flex items-start gap-4">
                                    <div className="relative w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                                        {photoPreview ? (
                                            <>
                                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={removePhoto}
                                                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="text-center">
                                                <Image className="h-8 w-8 mx-auto text-muted-foreground" />
                                                <p className="text-xs text-muted-foreground mt-1">No photo</p>
                                            </div>
                                        )}
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="cursor-pointer"
                                        />
                                        <p className="text-xs text-muted-foreground">Format: JPG, PNG (max 5MB)</p>
                                    </div>
                                </div>
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
                        placeholder="Cari instrumen..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tipe Aset" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        <SelectItem value="instrumen">Instrumen</SelectItem>
                        <SelectItem value="peralatan">Peralatan</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="terkalibrasi">Terkalibrasi</SelectItem>
                        <SelectItem value="jadwal_mendatang">Jadwal Mendatang</SelectItem>
                        <SelectItem value="lewat_jatuh_tempo">Lewat Jatuh Tempo</SelectItem>
                        <SelectItem value="dalam_perbaikan">Dalam Perbaikan</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Expandable List */}
            <div className="space-y-3">
                {displayInstruments.map((instrument) => (
                    <Collapsible
                        key={instrument.id}
                        open={openItems.includes(instrument.id)}
                        onOpenChange={() => toggleItem(instrument.id)}
                    >
                        <Card>
                            <CollapsibleTrigger asChild>
                                <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                                {instrument.photoUrl || instrument.photo ? (
                                                    <img src={instrument.photoUrl || instrument.photo || ""} alt={instrument.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Microscope className="h-6 w-6 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{instrument.name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {instrument.brand} {instrument.model} • {instrument.location} {(instrument.picName || instrument.picUser?.fullName) ? `• PIC: ${instrument.picName || instrument.picUser?.fullName}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <Badge variant={statusConfig[instrument.status]?.variant || "secondary"}>
                                                    {statusConfig[instrument.status]?.label || instrument.status}
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {instrument.daysUntilDue < 0
                                                        ? `${Math.abs(instrument.daysUntilDue)} hari lalu`
                                                        : instrument.daysUntilDue === 0
                                                            ? "Hari ini"
                                                            : `${instrument.daysUntilDue} hari lagi`}
                                                </p>
                                            </div>
                                            <ChevronDown className={`h-5 w-5 transition-transform ${openItems.includes(instrument.id) ? "rotate-180" : ""}`} />
                                        </div>
                                    </div>
                                </CardContent>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="pt-0 pb-4 px-4">
                                    <div className="border-t pt-4 mt-2">
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Vendor Kalibrasi</p>
                                                <p className="font-medium">{instrument.calibrationVendor || "-"}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">PIC Alat</p>
                                                <p className="font-medium">{instrument.picName || instrument.picUser?.fullName || "-"}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Interval</p>
                                                <p className="font-medium">{instrument.calibrationInterval} bulan</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Kalibrasi Terakhir</p>
                                                <p className="font-medium">
                                                    {instrument.lastCalibrationDate
                                                        ? new Date(instrument.lastCalibrationDate).toLocaleDateString("id-ID")
                                                        : "-"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Kalibrasi Selanjutnya</p>
                                                <p className="font-medium">
                                                    {instrument.nextCalibrationDate
                                                        ? new Date(instrument.nextCalibrationDate).toLocaleDateString("id-ID")
                                                        : "-"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Keterangan</p>
                                                <Badge variant={instrument.scheduleStatus === "sudah_dijadwalkan" ? "default" : "secondary"}>
                                                    {instrument.scheduleStatus === "sudah_dijadwalkan" ? "Sudah Dijadwalkan" : "Belum Dijadwalkan"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-4 pt-4 border-t">
                                            <Link href={`/instruments/database/${instrument.id}`}>
                                                <Button variant="outline" size="sm">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Lihat Detail
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive"
                                                onClick={() => setDeleteId(instrument.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Hapus
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                ))}
            </div>

            {displayInstruments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Microscope className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Tidak ada instrumen ditemukan</p>
                </div>
            )}

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
                        <AlertDialogTitle>Hapus Instrumen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus instrumen ini? Semua data kalibrasi terkait akan ikut terhapus.
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
