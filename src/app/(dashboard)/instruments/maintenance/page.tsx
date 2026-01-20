"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Search, Wrench, Pencil, Trash2, CheckCircle2, Clock, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { MaintenanceStatus, MaintenanceType } from "@/types"
import { useFetchPaginated, useFetch, useMutation } from "@/hooks/use-api"
import { Pagination } from "@/components/ui/pagination"

interface MaintenanceLog {
    id: string
    instrumentId: string
    instrumentName: string
    instrumentLocation: string
    performedBy: string | null
    performedByName: string | null
    maintenanceType: MaintenanceType
    issueDescription: string | null
    maintenanceActions: string | null
    maintenanceDate: string
    status: MaintenanceStatus
}

interface InstrumentOption {
    id: string
    name: string
    location: string
}

const statusConfig: Record<MaintenanceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
    completed: { label: "Selesai", variant: "default", icon: CheckCircle2 },
    scheduled: { label: "Terjadwal", variant: "secondary", icon: Clock },
    pending: { label: "Pending", variant: "outline", icon: AlertCircle },
}

const typeConfig: Record<MaintenanceType, { label: string; color: string }> = {
    corrective: { label: "Korektif", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    preventive: { label: "Preventif", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    inspection: { label: "Inspeksi", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
}

export default function MaintenancePage() {
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null)

    // Form state for add
    const [formData, setFormData] = useState({
        instrumentId: "",
        maintenanceType: "preventive" as MaintenanceType,
        maintenanceDate: new Date().toISOString().split("T")[0],
        performedBy: "",
        issueDescription: "",
        maintenanceActions: "",
        status: "pending" as MaintenanceStatus,
    })

    // Form state for edit
    const [editFormData, setEditFormData] = useState({
        maintenanceType: "preventive" as MaintenanceType,
        maintenanceDate: "",
        issueDescription: "",
        maintenanceActions: "",
        status: "pending" as MaintenanceStatus,
    })

    // Fetch maintenance logs from API with pagination
    const { data: logs, pagination, isLoading, error, refetch, search, setSearch, setPage } = useFetchPaginated<MaintenanceLog>(
        "/api/instruments/maintenance",
        { status: statusFilter, maintenanceType: typeFilter }
    )
    const displayLogs = logs || []

    // Fetch instruments for dropdown
    const { data: instrumentsData } = useFetch<{ data: InstrumentOption[], pagination: { total: number } }>("/api/instruments")
    const instruments = instrumentsData?.data || []

    // Create mutation
    const createMutation = useMutation<MaintenanceLog, typeof formData>(
        "/api/instruments/maintenance",
        "POST",
        {
            onSuccess: () => {
                setIsAddDialogOpen(false)
                setFormData({
                    instrumentId: "",
                    maintenanceType: "preventive",
                    maintenanceDate: new Date().toISOString().split("T")[0],
                    performedBy: "",
                    issueDescription: "",
                    maintenanceActions: "",
                    status: "pending",
                })
                refetch()
            }
        }
    )

    // Update mutation
    const updateMutation = useMutation<MaintenanceLog, typeof editFormData>(
        selectedLog ? `/api/instruments/maintenance/${selectedLog.id}` : "",
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
        selectedLog ? `/api/instruments/maintenance/${selectedLog.id}` : "",
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
        if (!formData.instrumentId || !formData.maintenanceType) {
            return
        }
        await createMutation.mutate(formData)
    }

    const handleEdit = (log: MaintenanceLog) => {
        setSelectedLog(log)
        setEditFormData({
            maintenanceType: log.maintenanceType,
            maintenanceDate: log.maintenanceDate,
            issueDescription: log.issueDescription || "",
            maintenanceActions: log.maintenanceActions || "",
            status: log.status,
        })
        setIsEditDialogOpen(true)
    }

    const handleEditSubmit = async () => {
        if (!editFormData.maintenanceType || !editFormData.maintenanceDate) {
            return
        }
        await updateMutation.mutate(editFormData)
    }

    const handleDelete = (log: MaintenanceLog) => {
        setSelectedLog(log)
        setIsDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        await deleteMutation.mutate(undefined)
    }

    // Stats
    const completedCount = displayLogs.filter(l => l.status === "completed").length
    const scheduledCount = displayLogs.filter(l => l.status === "scheduled").length
    const totalCount = pagination.total

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Memuat data maintenance...</p>
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
                    <h1 className="text-3xl font-bold tracking-tight">Maintenance Log</h1>
                    <p className="text-muted-foreground">
                        Kelola perawatan dan perbaikan instrumen
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Maintenance
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Tambah Log Maintenance</DialogTitle>
                            <DialogDescription>
                                Catat kegiatan perawatan atau perbaikan instrumen
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="instrument">Nama Instrumen *</Label>
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
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipe Maintenance *</Label>
                                    <Select
                                        value={formData.maintenanceType}
                                        onValueChange={(value: MaintenanceType) => setFormData(prev => ({ ...prev, maintenanceType: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih tipe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="corrective">Korektif</SelectItem>
                                            <SelectItem value="preventive">Preventif</SelectItem>
                                            <SelectItem value="inspection">Inspeksi</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Tanggal</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={formData.maintenanceDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, maintenanceDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="performedBy">Dilakukan Oleh</Label>
                                    <Input
                                        id="performedBy"
                                        placeholder="Contoh: Teknisi Internal"
                                        value={formData.performedBy}
                                        onChange={(e) => setFormData(prev => ({ ...prev, performedBy: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="issue">Deskripsi Masalah</Label>
                                <Textarea
                                    id="issue"
                                    placeholder="Jelaskan masalah atau alasan maintenance"
                                    rows={2}
                                    value={formData.issueDescription}
                                    onChange={(e) => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="actions">Tindakan Maintenance</Label>
                                <Textarea
                                    id="actions"
                                    placeholder="Jelaskan tindakan yang dilakukan"
                                    rows={2}
                                    value={formData.maintenanceActions}
                                    onChange={(e) => setFormData(prev => ({ ...prev, maintenanceActions: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value: MaintenanceStatus) => setFormData(prev => ({ ...prev, status: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="scheduled">Terjadwal</SelectItem>
                                        <SelectItem value="completed">Selesai</SelectItem>
                                    </SelectContent>
                                </Select>
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

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Aktivitas</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Terjadwal</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{scheduledCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Selesai</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedCount}</div>
                    </CardContent>
                </Card>
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
                        <SelectValue placeholder="Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        <SelectItem value="corrective">Korektif</SelectItem>
                        <SelectItem value="preventive">Preventif</SelectItem>
                        <SelectItem value="inspection">Inspeksi</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="completed">Selesai</SelectItem>
                        <SelectItem value="scheduled">Terjadwal</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Instrumen</TableHead>
                            <TableHead>Lokasi</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Dilakukan Oleh</TableHead>
                            <TableHead>Deskripsi</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayLogs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>{new Date(log.maintenanceDate).toLocaleDateString("id-ID")}</TableCell>
                                <TableCell className="font-medium">{log.instrumentName}</TableCell>
                                <TableCell>{log.instrumentLocation}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig[log.maintenanceType]?.color || ""}`}>
                                        {typeConfig[log.maintenanceType]?.label || log.maintenanceType}
                                    </span>
                                </TableCell>
                                <TableCell>{log.performedByName || log.performedBy || "-"}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{log.issueDescription || "-"}</TableCell>
                                <TableCell>
                                    <Badge variant={statusConfig[log.status]?.variant || "secondary"}>
                                        {statusConfig[log.status]?.label || log.status}
                                    </Badge>
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

            {displayLogs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Tidak ada log maintenance ditemukan</p>
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Pagination
                    pagination={pagination}
                    onPageChange={setPage}
                />
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Log Maintenance</DialogTitle>
                        <DialogDescription>
                            Edit data maintenance untuk {selectedLog?.instrumentName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nama Instrumen</Label>
                                <Input value={selectedLog?.instrumentName || ""} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-type">Tipe Maintenance *</Label>
                                <Select
                                    value={editFormData.maintenanceType}
                                    onValueChange={(value: MaintenanceType) => setEditFormData(prev => ({ ...prev, maintenanceType: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih tipe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="corrective">Korektif</SelectItem>
                                        <SelectItem value="preventive">Preventif</SelectItem>
                                        <SelectItem value="inspection">Inspeksi</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-date">Tanggal *</Label>
                                <Input
                                    id="edit-date"
                                    type="date"
                                    value={editFormData.maintenanceDate}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, maintenanceDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                    value={editFormData.status}
                                    onValueChange={(value: MaintenanceStatus) => setEditFormData(prev => ({ ...prev, status: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="scheduled">Terjadwal</SelectItem>
                                        <SelectItem value="completed">Selesai</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-issue">Deskripsi Masalah</Label>
                            <Textarea
                                id="edit-issue"
                                placeholder="Jelaskan masalah atau alasan maintenance"
                                rows={2}
                                value={editFormData.issueDescription}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-actions">Tindakan Maintenance</Label>
                            <Textarea
                                id="edit-actions"
                                placeholder="Jelaskan tindakan yang dilakukan"
                                rows={2}
                                value={editFormData.maintenanceActions}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, maintenanceActions: e.target.value }))}
                            />
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
                        <AlertDialogTitle>Hapus Log Maintenance?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus log maintenance untuk <strong>{selectedLog?.instrumentName}</strong> pada tanggal {selectedLog ? new Date(selectedLog.maintenanceDate).toLocaleDateString("id-ID") : ""}? Tindakan ini tidak dapat dibatalkan.
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
