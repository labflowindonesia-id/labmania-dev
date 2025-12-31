"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, FileText, Pencil, Trash2, Download, Loader2, RefreshCw, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useFetch, useMutation } from "@/hooks/use-api"

interface CalibrationLog {
    id: string
    instrumentId: string
    instrumentName: string
    assetType: string
    performedDate: string
    calibratorName: string | null
    calibratorPhone: string | null
    notes: string | null
    jobReportDocument: string | null
}

interface InstrumentOption {
    id: string
    name: string
    assetType: string
}

export default function CalibrationLogsPage() {
    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedLog, setSelectedLog] = useState<CalibrationLog | null>(null)

    // Form state for add
    const [formData, setFormData] = useState({
        instrumentId: "",
        performedDate: new Date().toISOString().split("T")[0],
        calibratorName: "",
        calibratorPhone: "",
        notes: "",
        jobReportDocument: "",
    })

    // Form state for edit
    const [editFormData, setEditFormData] = useState({
        performedDate: "",
        calibratorName: "",
        calibratorPhone: "",
        notes: "",
        jobReportDocument: "",
    })

    const [isUploading, setIsUploading] = useState(false)
    const [isEditUploading, setIsEditUploading] = useState(false)

    // Fetch calibration logs from API
    const { data, isLoading, error, refetch } = useFetch<{ logs: CalibrationLog[] }>("/api/instruments/calibration")

    // Fetch instruments for dropdown
    const { data: instrumentsData } = useFetch<{ instruments: InstrumentOption[] }>("/api/instruments")

    // Create mutation
    const createMutation = useMutation<CalibrationLog, typeof formData>(
        "/api/instruments/calibration",
        "POST",
        {
            onSuccess: () => {
                setIsAddDialogOpen(false)
                setFormData({
                    instrumentId: "",
                    performedDate: new Date().toISOString().split("T")[0],
                    calibratorName: "",
                    calibratorPhone: "",
                    notes: "",
                    jobReportDocument: "",
                })
                refetch()
            }
        }
    )

    // Update mutation
    const updateMutation = useMutation<CalibrationLog, typeof editFormData>(
        selectedLog ? `/api/instruments/calibration/${selectedLog.id}` : "",
        "PUT",
        {
            onSuccess: () => {
                setIsEditDialogOpen(false)
                setSelectedLog(null)
                refetch()
            }
        }
    )

    // Delete mutation
    const deleteMutation = useMutation<{ success: boolean }, undefined>(
        selectedLog ? `/api/instruments/calibration/${selectedLog.id}` : "",
        "DELETE",
        {
            onSuccess: () => {
                setIsDeleteDialogOpen(false)
                setSelectedLog(null)
                refetch()
            }
        }
    )

    const handleSubmit = async () => {
        if (!formData.instrumentId || !formData.performedDate) {
            return
        }
        await createMutation.mutate(formData)
    }

    const handleEdit = (log: CalibrationLog) => {
        setSelectedLog(log)
        setEditFormData({
            performedDate: log.performedDate,
            calibratorName: log.calibratorName || "",
            calibratorPhone: log.calibratorPhone || "",
            notes: log.notes || "",
            jobReportDocument: log.jobReportDocument || "",
        })
        setIsEditDialogOpen(true)
    }

    const handleEditSubmit = async () => {
        if (!editFormData.performedDate) {
            return
        }
        await updateMutation.mutate(editFormData)
    }

    const handleDelete = (log: CalibrationLog) => {
        setSelectedLog(log)
        setIsDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        await deleteMutation.mutate(undefined)
    }

    const logs = data?.logs || []
    const instruments = instrumentsData?.instruments || []

    const filteredLogs = logs.filter((log) => {
        const matchesSearch = log.instrumentName.toLowerCase().includes(search.toLowerCase()) ||
            (log.calibratorName?.toLowerCase().includes(search.toLowerCase()) ?? false)
        const matchesType = typeFilter === "all" || log.assetType === typeFilter
        return matchesSearch && matchesType
    })

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Memuat data kalibrasi...</p>
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
                    <h1 className="text-3xl font-bold tracking-tight">Log Kalibrasi</h1>
                    <p className="text-muted-foreground">
                        Riwayat pelaksanaan kalibrasi instrumen dan peralatan
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Input Kalibrasi
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Input Log Kalibrasi</DialogTitle>
                            <DialogDescription>
                                Catat pelaksanaan kalibrasi instrumen
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Tanggal Pelaksanaan *</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={formData.performedDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, performedDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="instrument">Nama Alat *</Label>
                                    <Select
                                        value={formData.instrumentId}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, instrumentId: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih instrumen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {instruments.map((inst) => (
                                                <SelectItem key={inst.id} value={inst.id}>
                                                    {inst.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="calibrator">Nama Pengkalibrasi</Label>
                                    <Input
                                        id="calibrator"
                                        placeholder="Contoh: Teknisi A"
                                        value={formData.calibratorName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, calibratorName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">No HP Pengkalibrasi</Label>
                                    <Input
                                        id="phone"
                                        placeholder="Contoh: 081234567890"
                                        value={formData.calibratorPhone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, calibratorPhone: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Catatan</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Catatan pelaksanaan kalibrasi"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="document">Dokumen Laporan</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="document"
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return

                                            setIsUploading(true)
                                            try {
                                                const formDataUpload = new FormData()
                                                formDataUpload.append("file", file)
                                                formDataUpload.append("bucket", "calibration-reports")

                                                const response = await fetch("/api/upload", {
                                                    method: "POST",
                                                    body: formDataUpload,
                                                })

                                                if (response.ok) {
                                                    const data = await response.json()
                                                    setFormData(prev => ({ ...prev, jobReportDocument: data.publicUrl }))
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
                                    {formData.jobReportDocument && (
                                        <Badge variant="secondary" className="gap-1">
                                            <FileText className="h-3 w-3" />
                                            Uploaded
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Format: PDF, DOC, DOCX (max 10MB)</p>
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
                        placeholder="Cari instrumen atau teknisi..."
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
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Nama Alat</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Pengkalibrasi</TableHead>
                            <TableHead>No HP</TableHead>
                            <TableHead>Catatan</TableHead>
                            <TableHead>Dokumen</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>{new Date(log.performedDate).toLocaleDateString("id-ID")}</TableCell>
                                <TableCell className="font-medium">{log.instrumentName}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {log.assetType === "instrumen" ? "Instrumen" : "Peralatan"}
                                    </Badge>
                                </TableCell>
                                <TableCell>{log.calibratorName || "-"}</TableCell>
                                <TableCell>{log.calibratorPhone || "-"}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{log.notes || "-"}</TableCell>
                                <TableCell>
                                    {log.jobReportDocument && (
                                        <Button variant="ghost" size="sm" asChild>
                                            <a href={log.jobReportDocument} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4 mr-1" />
                                                PDF
                                            </a>
                                        </Button>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(log)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(log)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {filteredLogs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Tidak ada log kalibrasi ditemukan</p>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Log Kalibrasi</DialogTitle>
                        <DialogDescription>
                            Edit data kalibrasi untuk {selectedLog?.instrumentName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-date">Tanggal Pelaksanaan *</Label>
                                <Input
                                    id="edit-date"
                                    type="date"
                                    value={editFormData.performedDate}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, performedDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nama Alat</Label>
                                <Input value={selectedLog?.instrumentName || ""} disabled />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-calibrator">Nama Pengkalibrasi</Label>
                                <Input
                                    id="edit-calibrator"
                                    placeholder="Contoh: Teknisi A"
                                    value={editFormData.calibratorName}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, calibratorName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">No HP Pengkalibrasi</Label>
                                <Input
                                    id="edit-phone"
                                    placeholder="Contoh: 081234567890"
                                    value={editFormData.calibratorPhone}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, calibratorPhone: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-notes">Catatan</Label>
                            <Textarea
                                id="edit-notes"
                                placeholder="Catatan pelaksanaan kalibrasi"
                                rows={3}
                                value={editFormData.notes}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-document">Dokumen Laporan</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="edit-document"
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return

                                        setIsEditUploading(true)
                                        try {
                                            const formDataUpload = new FormData()
                                            formDataUpload.append("file", file)
                                            formDataUpload.append("bucket", "calibration-reports")

                                            const response = await fetch("/api/upload", {
                                                method: "POST",
                                                body: formDataUpload,
                                            })

                                            if (response.ok) {
                                                const data = await response.json()
                                                setEditFormData(prev => ({ ...prev, jobReportDocument: data.publicUrl }))
                                            }
                                        } catch (error) {
                                            console.error("Upload error:", error)
                                        } finally {
                                            setIsEditUploading(false)
                                        }
                                    }}
                                    className="flex-1"
                                />
                                {isEditUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editFormData.jobReportDocument && (
                                    <Badge variant="secondary" className="gap-1">
                                        <FileText className="h-3 w-3" />
                                        Uploaded
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">Format: PDF, DOC, DOCX (max 10MB)</p>
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Log Kalibrasi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus log kalibrasi untuk <strong>{selectedLog?.instrumentName}</strong> pada tanggal {selectedLog ? new Date(selectedLog.performedDate).toLocaleDateString("id-ID") : ""}? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
