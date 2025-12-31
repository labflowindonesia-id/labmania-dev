"use client"

import { use, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowLeft,
    Edit,
    Calendar,
    MapPin,
    User,
    Phone,
    Building2,
    Clock,
    FileText,
    Wrench,
    Download,
    Loader2,
    RefreshCw,
    AlertCircle,
    Upload
} from "lucide-react"
import { InstrumentStatus } from "@/types"
import { useFetch, useMutation } from "@/hooks/use-api"

// Type definitions for API response
interface CalibrationLog {
    id: string
    instrumentId: string
    performedDate: string
    calibratorName: string | null
    calibratorPhone: string | null
    notes: string | null
    jobReportDocument: string | null
    createdAt: string
}

interface MaintenanceLog {
    id: string
    instrumentId: string
    maintenanceDate: string
    maintenanceType: string
    issueDescription: string | null
    maintenanceActions: string | null
    status: string
    performedByUser?: { fullName: string }
    createdAt: string
}

interface InstrumentDetail {
    id: string
    name: string
    brand: string | null
    model: string | null
    serialNumber: string | null
    assetNumber: string | null
    purchaseDate: string | null
    calibrationVendor: string | null
    calibrationVendorPhone: string | null
    location: string
    assetType: string
    status: InstrumentStatus
    calibrationInterval: number
    lastCalibrationDate: string | null
    nextCalibrationDate: string | null
    daysUntilDue: number
    description: string | null
    photoUrl: string | null
    picUser?: { fullName: string }
    pic?: string | null
    picName?: string | null
    calibrationLogs?: CalibrationLog[]
    maintenanceLogs?: MaintenanceLog[]
}

const statusConfig: Record<InstrumentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    terkalibrasi: { label: "Terkalibrasi", variant: "default" },
    jadwal_mendatang: { label: "Jadwal Mendatang", variant: "secondary" },
    lewat_jatuh_tempo: { label: "Lewat Jatuh Tempo", variant: "destructive" },
    dalam_perbaikan: { label: "Dalam Perbaikan", variant: "outline" },
}

const maintenanceTypeConfig: Record<string, { label: string }> = {
    preventive: { label: "Preventif" },
    corrective: { label: "Korektif" },
    inspection: { label: "Inspeksi" },
}

// PIC options as specified by user
const picOptions = [
    { value: "KEP", label: "KEP" },
    { value: "GEP", label: "GEP" },
]

// Location options from storageLocationEnum
const locationOptions = [
    { value: "TC 1", label: "TC 1" },
    { value: "TC 2", label: "TC 2" },
    { value: "TC 3", label: "TC 3" },
]

export default function InstrumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // In Next.js 15, params is a Promise - use React.use() to unwrap
    const { id } = use(params)

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // Form state for edit
    const [editFormData, setEditFormData] = useState({
        name: "",
        brand: "",
        model: "",
        serialNumber: "",
        assetNumber: "",
        pic: "",
        location: "",
        calibrationVendor: "",
        calibrationVendorPhone: "",
        calibrationInterval: 12,
        purchaseDate: "",
        photo: "",
    })

    // Fetch instrument data from API
    const { data, isLoading, error, refetch } = useFetch<{ instrument: InstrumentDetail }>(`/api/instruments/${id}`)

    // Update mutation
    const updateMutation = useMutation<InstrumentDetail, typeof editFormData>(
        `/api/instruments/${id}`,
        "PUT",
        {
            onSuccess: () => {
                setIsEditDialogOpen(false)
                refetch()
            }
        }
    )

    const instrument = data?.instrument

    const handleEdit = () => {
        if (instrument) {
            setEditFormData({
                name: instrument.name || "",
                brand: instrument.brand || "",
                model: instrument.model || "",
                serialNumber: instrument.serialNumber || "",
                assetNumber: instrument.assetNumber || "",
                pic: instrument.picName || "",
                location: instrument.location || "",
                calibrationVendor: instrument.calibrationVendor || "",
                calibrationVendorPhone: instrument.calibrationVendorPhone || "",
                calibrationInterval: instrument.calibrationInterval || 12,
                purchaseDate: instrument.purchaseDate || "",
                photo: instrument.photoUrl || "",
            })
            setIsEditDialogOpen(true)
        }
    }

    const handleEditSubmit = async () => {
        if (!editFormData.name || !editFormData.location) {
            return
        }
        await updateMutation.mutate({
            ...editFormData,
            calibrationInterval: Number(editFormData.calibrationInterval),
        })
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
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive mb-4">{error}</p>
                <div className="flex gap-2">
                    <Link href="/instruments/database">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Kembali
                        </Button>
                    </Link>
                    <Button onClick={refetch} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Coba Lagi
                    </Button>
                </div>
            </div>
        )
    }

    // Not found state
    if (!instrument) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Instrumen tidak ditemukan</p>
                <Link href="/instruments/database">
                    <Button variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Kembali ke Database
                    </Button>
                </Link>
            </div>
        )
    }

    const daysUntilCalibration = instrument.daysUntilDue
    const calibrationLogs = instrument.calibrationLogs || []
    const maintenanceLogs = instrument.maintenanceLogs || []

    // Calculate instrument age in years
    const getInstrumentAge = (): string => {
        if (!instrument.purchaseDate) return "-"
        const purchaseDate = new Date(instrument.purchaseDate)
        const years = Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
        return `${years} tahun`
    }

    // Format date for display
    const formatDate = (dateString: string | null): string => {
        if (!dateString) return "-"
        return new Date(dateString).toLocaleDateString("id-ID")
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/instruments/database">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{instrument.name}</h1>
                        <p className="text-muted-foreground">
                            {instrument.brand} {instrument.model}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={statusConfig[instrument.status]?.variant || "secondary"} className="text-sm">
                        {statusConfig[instrument.status]?.label || instrument.status}
                    </Badge>
                    <Button variant="outline" onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                    <Button>
                        <Calendar className="h-4 w-4 mr-2" />
                        Input Kalibrasi
                    </Button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Info Cards - Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi Dasar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Serial Number</p>
                                            <p className="font-medium">{instrument.serialNumber || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Asset Number</p>
                                            <p className="font-medium">{instrument.assetNumber || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Lokasi</p>
                                            <p className="font-medium">{instrument.location}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Tanggal Pembelian</p>
                                            <p className="font-medium">{formatDate(instrument.purchaseDate)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">PIC Alat</p>
                                            <p className="font-medium">{instrument.picName || instrument.picUser?.fullName || "-"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {instrument.description && (
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-sm text-muted-foreground">Deskripsi</p>
                                    <p className="mt-1">{instrument.description}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Calibration Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi Kalibrasi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Vendor Kalibrasi</p>
                                            <p className="font-medium">{instrument.calibrationVendor || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Kontak Vendor</p>
                                            {instrument.calibrationVendorPhone ? (
                                                <a
                                                    href={`tel:${instrument.calibrationVendorPhone}`}
                                                    className="font-medium text-primary hover:underline"
                                                >
                                                    {instrument.calibrationVendorPhone}
                                                </a>
                                            ) : (
                                                <p className="font-medium">-</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Interval Kalibrasi</p>
                                            <p className="font-medium">{instrument.calibrationInterval} bulan</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Kalibrasi Terakhir</p>
                                            <p className="font-medium">{formatDate(instrument.lastCalibrationDate)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Kalibrasi Selanjutnya</p>
                                            <p className="font-medium">{formatDate(instrument.nextCalibrationDate)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Sisa Waktu</p>
                                            <p className={`font-medium ${daysUntilCalibration < 0 ? "text-red-600" : daysUntilCalibration < 30 ? "text-yellow-600" : ""}`}>
                                                {daysUntilCalibration < 0
                                                    ? `${Math.abs(daysUntilCalibration)} hari terlambat`
                                                    : `${daysUntilCalibration} hari lagi`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* History Tabs */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Riwayat</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="calibration">
                                <TabsList>
                                    <TabsTrigger value="calibration">Kalibrasi ({calibrationLogs.length})</TabsTrigger>
                                    <TabsTrigger value="maintenance">Maintenance ({maintenanceLogs.length})</TabsTrigger>
                                </TabsList>
                                <TabsContent value="calibration" className="mt-4">
                                    {calibrationLogs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                            <Calendar className="h-8 w-8 mb-2 opacity-50" />
                                            <p>Belum ada riwayat kalibrasi</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tanggal</TableHead>
                                                    <TableHead>Pengkalibrasi</TableHead>
                                                    <TableHead>Catatan</TableHead>
                                                    <TableHead>Dokumen</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {calibrationLogs.map((cal) => (
                                                    <TableRow key={cal.id}>
                                                        <TableCell>{formatDate(cal.performedDate)}</TableCell>
                                                        <TableCell>{cal.calibratorName || "-"}</TableCell>
                                                        <TableCell>{cal.notes || "-"}</TableCell>
                                                        <TableCell>
                                                            {cal.jobReportDocument && (
                                                                <Button variant="ghost" size="sm" asChild>
                                                                    <a href={cal.jobReportDocument} target="_blank" rel="noopener noreferrer">
                                                                        <Download className="h-4 w-4 mr-1" />
                                                                        PDF
                                                                    </a>
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </TabsContent>
                                <TabsContent value="maintenance" className="mt-4">
                                    {maintenanceLogs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                            <Wrench className="h-8 w-8 mb-2 opacity-50" />
                                            <p>Belum ada riwayat maintenance</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tanggal</TableHead>
                                                    <TableHead>Tipe</TableHead>
                                                    <TableHead>Deskripsi</TableHead>
                                                    <TableHead>Dilakukan Oleh</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {maintenanceLogs.map((mnt) => (
                                                    <TableRow key={mnt.id}>
                                                        <TableCell>{formatDate(mnt.maintenanceDate)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {maintenanceTypeConfig[mnt.maintenanceType]?.label || mnt.maintenanceType}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{mnt.issueDescription || mnt.maintenanceActions || "-"}</TableCell>
                                                        <TableCell>{mnt.performedByUser?.fullName || "-"}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Photo & Quick Actions */}
                <div className="space-y-6">
                    {/* Photo */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Foto Alat</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                                {instrument.photoUrl ? (
                                    <img
                                        src={instrument.photoUrl}
                                        alt={instrument.name}
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                ) : (
                                    <Wrench className="h-16 w-16 text-muted-foreground/50" />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                {instrument.photoUrl ? "Klik untuk melihat foto lebih besar" : "Belum ada foto"}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Statistik</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Total Kalibrasi</span>
                                <span className="font-semibold">{calibrationLogs.length}x</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Total Maintenance</span>
                                <span className="font-semibold">{maintenanceLogs.length}x</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Usia Alat</span>
                                <span className="font-semibold">{getInstrumentAge()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Instrumen</DialogTitle>
                        <DialogDescription>
                            Edit informasi instrumen {instrument.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nama Instrumen *</Label>
                                <Input
                                    id="edit-name"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-brand">Brand</Label>
                                <Input
                                    id="edit-brand"
                                    value={editFormData.brand}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, brand: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-model">Model</Label>
                                <Input
                                    id="edit-model"
                                    value={editFormData.model}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, model: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-serial">Serial Number</Label>
                                <Input
                                    id="edit-serial"
                                    value={editFormData.serialNumber}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-asset">Asset Number</Label>
                                <Input
                                    id="edit-asset"
                                    value={editFormData.assetNumber}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, assetNumber: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-pic">PIC Alat</Label>
                                <Select
                                    value={editFormData.pic}
                                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, pic: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih PIC" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {picOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-location">Lokasi *</Label>
                                <Select
                                    value={editFormData.location}
                                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, location: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih lokasi" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locationOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-purchase-date">Tanggal Pembelian</Label>
                                <Input
                                    id="edit-purchase-date"
                                    type="date"
                                    value={editFormData.purchaseDate}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-vendor">Vendor Kalibrasi</Label>
                                <Input
                                    id="edit-vendor"
                                    value={editFormData.calibrationVendor}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, calibrationVendor: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-vendor-phone">Kontak Vendor</Label>
                                <Input
                                    id="edit-vendor-phone"
                                    value={editFormData.calibrationVendorPhone}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, calibrationVendorPhone: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-interval">Interval Kalibrasi (bulan)</Label>
                                <Input
                                    id="edit-interval"
                                    type="number"
                                    min="1"
                                    value={editFormData.calibrationInterval}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, calibrationInterval: parseInt(e.target.value) || 12 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-photo">Foto</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="edit-photo"
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return

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
                                                    const data = await response.json()
                                                    setEditFormData(prev => ({ ...prev, photo: data.publicUrl }))
                                                }
                                            } catch (error) {
                                                console.error("Upload error:", error)
                                            } finally {
                                                setIsUploading(false)
                                            }
                                        }}
                                        className="flex-1"
                                    />
                                    {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                                </div>
                                {editFormData.photo && (
                                    <div className="mt-2">
                                        <img
                                            src={editFormData.photo}
                                            alt="Preview"
                                            className="w-20 h-20 object-cover rounded-lg"
                                        />
                                    </div>
                                )}
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
                        <Button onClick={handleEditSubmit} disabled={updateMutation.isLoading}>
                            {updateMutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
