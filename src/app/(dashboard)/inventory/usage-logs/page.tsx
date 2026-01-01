"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Search, ClipboardList, Loader2, RefreshCw, Plus, Trash2 } from "lucide-react"
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
import { useFetch, useMutation } from "@/hooks/use-api"

interface UsageLog {
    id: string
    date: string
    usageItem: string
    itemType: string
    quantityUsed: string
    unit: string | null
    notes: string | null
    user?: {
        fullName: string
    }
}

const itemTypeConfig: Record<string, { label: string; color: string }> = {
    reagent: { label: "Reagen", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    standard: { label: "Standard", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200" },
    consumable: { label: "Consumable", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    barang: { label: "Barang", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
}

export default function UsageLogsPage() {
    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        usageItem: "",
        itemType: "",
        quantityUsed: "",
        unit: "",
        notes: "",
        date: new Date().toISOString().split("T")[0],
    })

    // Fetch usage logs from API
    const { data, isLoading, error, refetch } = useFetch<{ usageLogs: UsageLog[] }>("/api/inventory/usage-logs")

    // Create mutation
    const createMutation = useMutation<UsageLog, typeof formData>(
        "/api/inventory/usage-logs",
        "POST",
        {
            onSuccess: () => {
                setIsAddDialogOpen(false)
                setFormData({
                    usageItem: "",
                    itemType: "",
                    quantityUsed: "",
                    unit: "",
                    notes: "",
                    date: new Date().toISOString().split("T")[0],
                })
                refetch()
            }
        }
    )

    const handleSubmit = async () => {
        if (!formData.usageItem || !formData.itemType || !formData.quantityUsed) {
            return
        }
        await createMutation.mutate(formData)
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/inventory/usage-logs/${deleteId}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Gagal menghapus")
            refetch()
        } catch (err) {
            console.error(err)
        } finally {
            setIsDeleting(false)
            setDeleteId(null)
        }
    }

    const usageLogs = data?.usageLogs || []

    const filteredLogs = usageLogs.filter((log) => {
        const matchesSearch = log.usageItem.toLowerCase().includes(search.toLowerCase()) ||
            (log.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ?? false)
        const matchesType = typeFilter === "all" || log.itemType === typeFilter
        return matchesSearch && matchesType
    })

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Memuat data usage logs...</p>
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
                    <h1 className="text-3xl font-bold tracking-tight">Log Penggunaan</h1>
                    <p className="text-muted-foreground">
                        Riwayat penggunaan bahan dan peralatan laboratorium
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Log
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Tambah Log Penggunaan</DialogTitle>
                            <DialogDescription>
                                Catat penggunaan bahan atau peralatan laboratorium
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="itemType">Tipe Item *</Label>
                                    <Select
                                        value={formData.itemType}
                                        onValueChange={(value) => setFormData({ ...formData, itemType: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih tipe" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="reagent">Reagen</SelectItem>
                                            <SelectItem value="standard">Standard</SelectItem>
                                            <SelectItem value="consumable">Consumable</SelectItem>
                                            <SelectItem value="barang">Barang</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date">Tanggal</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="usageItem">Nama Item *</Label>
                                <Input
                                    id="usageItem"
                                    placeholder="Contoh: NaOH 1M, Pipet Tips 1000ul"
                                    value={formData.usageItem}
                                    onChange={(e) => setFormData({ ...formData, usageItem: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="quantityUsed">Jumlah Digunakan *</Label>
                                    <Input
                                        id="quantityUsed"
                                        type="number"
                                        placeholder="10"
                                        value={formData.quantityUsed}
                                        onChange={(e) => setFormData({ ...formData, quantityUsed: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="unit">Satuan</Label>
                                    <Select
                                        value={formData.unit}
                                        onValueChange={(value) => setFormData({ ...formData, unit: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih satuan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ml">ml</SelectItem>
                                            <SelectItem value="L">L</SelectItem>
                                            <SelectItem value="g">g</SelectItem>
                                            <SelectItem value="kg">kg</SelectItem>
                                            <SelectItem value="pcs">pcs</SelectItem>
                                            <SelectItem value="pack">pack</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Keterangan</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Catatan penggunaan (opsional)"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={createMutation.isLoading || !formData.usageItem || !formData.itemType || !formData.quantityUsed}
                            >
                                {createMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                        placeholder="Cari item atau pengguna..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tipe Item" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        <SelectItem value="reagent">Reagen</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="consumable">Consumable</SelectItem>
                        <SelectItem value="barang">Barang</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Pengguna</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>{new Date(log.date).toLocaleDateString("id-ID")}</TableCell>
                                <TableCell className="font-medium">{log.user?.fullName || "-"}</TableCell>
                                <TableCell>{log.usageItem}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${itemTypeConfig[log.itemType]?.color || "bg-gray-100 text-gray-800"}`}>
                                        {itemTypeConfig[log.itemType]?.label || log.itemType}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    {log.quantityUsed} {log.unit || ""}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{log.notes || "-"}</TableCell>
                                <TableCell className="text-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setDeleteId(log.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {filteredLogs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Tidak ada log ditemukan</p>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Log?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus log penggunaan ini? Tindakan ini tidak dapat dibatalkan.
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
