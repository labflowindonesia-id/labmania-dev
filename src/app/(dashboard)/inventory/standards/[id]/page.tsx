"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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

const storageLocations = ["TC 1", "TC 2", "TC 3"]
const forms = ["liquid", "solid", "gas"]
const sizeUnits = ["mL", "L", "g", "kg", "mg", "unit"]

export default function StandardDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const resolvedParams = use(params)
    const [standard, setStandard] = useState<StandardDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Edit states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({
        standardName: "",
        casNumber: "",
        chemicalFormula: "",
        supplier: "",
        sizeValue: "",
        sizeUnit: "",
        form: "",
        storageLocation: "",
        minimumStockLevel: 0,
    })

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
            // Initialize edit form
            setEditForm({
                standardName: data.standard.standardName || "",
                casNumber: data.standard.casNumber || "",
                chemicalFormula: data.standard.chemicalFormula || "",
                supplier: data.standard.supplier || "",
                sizeValue: data.standard.sizeValue?.toString() || "",
                sizeUnit: data.standard.sizeUnit || "",
                form: data.standard.form || "",
                storageLocation: data.standard.storageLocation || "",
                minimumStockLevel: data.standard.minimumStockLevel || 0,
            })
        } catch (err) {
            setError("Terjadi kesalahan saat mengambil data")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
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

    const handleEdit = async () => {
        try {
            setIsEditing(true)
            const payload = {
                ...editForm,
                sizeValue: editForm.sizeValue ? parseFloat(editForm.sizeValue) : null,
            }
            const response = await fetch(`/api/inventory/standards/${resolvedParams.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (response.ok) {
                setIsEditDialogOpen(false)
                fetchStandard() // Refresh data
            } else {
                setError("Gagal mengupdate standard")
            }
        } catch (err) {
            setError("Terjadi kesalahan saat mengupdate")
        } finally {
            setIsEditing(false)
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
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Edit Standard</DialogTitle>
                                <DialogDescription>
                                    Ubah informasi standard di bawah ini.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                                <div className="grid gap-2">
                                    <Label htmlFor="standardName">Nama Standard *</Label>
                                    <Input
                                        id="standardName"
                                        value={editForm.standardName}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, standardName: e.target.value }))}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="casNumber">CAS Number</Label>
                                        <Input
                                            id="casNumber"
                                            value={editForm.casNumber}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, casNumber: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="chemicalFormula">Rumus Kimia</Label>
                                        <Input
                                            id="chemicalFormula"
                                            value={editForm.chemicalFormula}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, chemicalFormula: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="supplier">Supplier</Label>
                                    <Input
                                        id="supplier"
                                        value={editForm.supplier}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, supplier: e.target.value }))}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="sizeValue">Ukuran</Label>
                                        <Input
                                            id="sizeValue"
                                            type="number"
                                            value={editForm.sizeValue}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, sizeValue: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="sizeUnit">Satuan</Label>
                                        <Select
                                            value={editForm.sizeUnit}
                                            onValueChange={(value) => setEditForm(prev => ({ ...prev, sizeUnit: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih satuan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sizeUnits.map((unit) => (
                                                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="storageLocation">Lokasi Penyimpanan</Label>
                                        <Select
                                            value={editForm.storageLocation}
                                            onValueChange={(value) => setEditForm(prev => ({ ...prev, storageLocation: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih lokasi" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {storageLocations.map((loc) => (
                                                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="form">Bentuk</Label>
                                        <Select
                                            value={editForm.form}
                                            onValueChange={(value) => setEditForm(prev => ({ ...prev, form: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih bentuk" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {forms.map((f) => (
                                                    <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="minimumStockLevel">Minimum Stok Level</Label>
                                    <Input
                                        id="minimumStockLevel"
                                        type="number"
                                        value={editForm.minimumStockLevel}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, minimumStockLevel: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
                                <Button onClick={handleEdit} disabled={isEditing || !editForm.standardName}>
                                    {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                                    Tindakan ini tidak dapat dibatalkan. Standard &quot;{standard.standardName}&quot; akan dihapus secara permanen.
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
