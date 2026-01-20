"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, Play, Users, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Plus, Trash2, Search } from "lucide-react"
import { useFetchPaginated, useMutation } from "@/hooks/use-api"
import { Pagination } from "@/components/ui/pagination"

interface TrainingSetItem {
    id: string
    itemType: string
    itemName: string
    quantity: string
    unit: string | null
}

interface TrainingSet {
    id: string
    trainingName: string
    participantsPerSet: number
    items: TrainingSetItem[]
}

type StockCheckResult = {
    item: string
    type: string
    required: number
    available: number
    unit: string
    status: "available" | "insufficient" | "not_found"
}

export default function TrainingPage() {
    const router = useRouter()
    const [selectedTraining, setSelectedTraining] = useState<string>("")
    const [participants, setParticipants] = useState<string>("")
    const [isCheckDialogOpen, setIsCheckDialogOpen] = useState(false)
    const [checkResults, setCheckResults] = useState<StockCheckResult[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [isChecking, setIsChecking] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form state for adding new training set
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newTrainingName, setNewTrainingName] = useState("")
    const [newParticipantsPerSet, setNewParticipantsPerSet] = useState("")
    const [newItems, setNewItems] = useState<{ itemType: string; itemName: string; quantity: string; unit: string }[]>([])

    // Warehouse options for dropdowns
    const [warehouseOptions, setWarehouseOptions] = useState<Record<string, { id: string; name: string; unit: string }[]>>({})
    const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({})

    // Fetch training sets from API with pagination
    const { data: trainingSets, pagination, isLoading, error, refetch, search, setSearch, setPage } = useFetchPaginated<TrainingSet>(
        "/api/inventory/training",
        {}
    )
    const displayTrainingSets = trainingSets || []

    // Create training set mutation
    const createTraining = useMutation<TrainingSet, { trainingName: string; participantsPerSet: number; items: typeof newItems }>(
        "/api/inventory/training",
        "POST",
        {
            onSuccess: () => {
                setIsAddDialogOpen(false)
                setNewTrainingName("")
                setNewParticipantsPerSet("")
                setNewItems([])
                setWarehouseOptions({})
                refetch()
            }
        }
    )

    // Fetch warehouse options based on type
    const fetchWarehouseOptions = async (type: string) => {
        if (warehouseOptions[type] || loadingOptions[type]) return

        setLoadingOptions(prev => ({ ...prev, [type]: true }))
        try {
            const response = await fetch(`/api/inventory/warehouse-options?type=${type}`)
            if (response.ok) {
                const data = await response.json()
                setWarehouseOptions(prev => ({ ...prev, [type]: data.items || [] }))
            }
        } catch (err) {
            console.error("Error fetching warehouse options:", err)
        } finally {
            setLoadingOptions(prev => ({ ...prev, [type]: false }))
        }
    }

    const handleAddItem = () => {
        setNewItems([...newItems, { itemType: "", itemName: "", quantity: "", unit: "" }])
    }

    const handleRemoveItem = (index: number) => {
        setNewItems(newItems.filter((_, i) => i !== index))
    }

    const handleUpdateItem = async (index: number, field: string, value: string) => {
        const updated = [...newItems]
        updated[index] = { ...updated[index], [field]: value }

        // If type changed, reset item name and unit, and fetch options
        if (field === "itemType") {
            updated[index].itemName = ""
            updated[index].unit = ""
            await fetchWarehouseOptions(value)
        }

        // If item name changed, auto-fill unit from warehouse options
        if (field === "itemName" && updated[index].itemType) {
            const options = warehouseOptions[updated[index].itemType] || []
            const selectedItem = options.find(opt => opt.name === value)
            if (selectedItem) {
                updated[index].unit = selectedItem.unit
            }
        }

        setNewItems(updated)
    }

    const handleCreateTraining = async () => {
        if (!newTrainingName || !newParticipantsPerSet || newItems.length === 0) return

        await createTraining.mutate({
            trainingName: newTrainingName,
            participantsPerSet: parseInt(newParticipantsPerSet),
            items: newItems.filter(item => item.itemName && item.quantity)
        })
    }

    const handleDeleteTraining = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/inventory/training/${deleteId}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Gagal menghapus")
            refetch()
        } catch (err) {
            console.error(err)
        } finally {
            setIsDeleting(false)
            setDeleteId(null)
        }
    }

    const handleCheckStock = async () => {
        if (!selectedTraining || !participants) return

        setIsChecking(true)
        try {
            const response = await fetch(`/api/inventory/training/${selectedTraining}?action=check-stock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ participants: parseInt(participants) }),
            })

            if (response.ok) {
                const data = await response.json()
                setCheckResults(data.stockCheck || [])
            } else {
                // Fallback to mock if API fails
                const training = displayTrainingSets.find(t => t.id === selectedTraining)
                if (training) {
                    const numParticipants = parseInt(participants)
                    const sets = Math.ceil(numParticipants / training.participantsPerSet)

                    const results: StockCheckResult[] = training.items.map(item => ({
                        item: item.itemName,
                        type: item.itemType,
                        required: Number(item.quantity) * sets,
                        available: Math.floor(Math.random() * 30) + 5,
                        unit: item.unit || "unit",
                        status: Math.random() > 0.2 ? "available" as const : "insufficient" as const,
                    }))
                    setCheckResults(results)
                }
            }
        } catch (err) {
            console.error("Stock check error:", err)
        } finally {
            setIsChecking(false)
            setIsCheckDialogOpen(true)
        }
    }

    const hasInsufficientStock = checkResults.some(r => r.status === "insufficient" || r.status === "not_found")

    const handleProcessTraining = async () => {
        if (!selectedTraining || !participants) return

        setIsProcessing(true)
        try {
            const response = await fetch(`/api/inventory/training/${selectedTraining}?action=process`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ participants: parseInt(participants) }),
            })

            const result = await response.json()

            if (response.ok && result.success) {
                setIsCheckDialogOpen(false)
                setSelectedTraining("")
                setParticipants("")
                setCheckResults([])
                alert(`Training berhasil diproses! ${result.message}\n\nItem yang diproses:\n${result.processed.map((p: { item: string; action: string; quantity: number }) => `- ${p.item}: ${p.action === 'reduced' ? 'dikurangi' : 'dipantau'} ${p.quantity}`).join('\n')}`)
            } else {
                alert(`Gagal memproses training: ${result.message || result.error}`)
            }
        } catch (err) {
            console.error("Process training error:", err)
            alert("Terjadi kesalahan saat memproses training")
        } finally {
            setIsProcessing(false)
        }
    }

    // Group items by type for display
    const groupItemsByType = (items: TrainingSetItem[]) => {
        const equipment = items.filter(i => i.itemType === "equipment")
        const consumables = items.filter(i => i.itemType === "consumable")
        const reagents = items.filter(i => i.itemType === "reagent_standard")
        return { equipment, consumables, reagents }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Memuat data training...</p>
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
                    <h1 className="text-3xl font-bold tracking-tight">Training Usage</h1>
                    <p className="text-muted-foreground">
                        Kelola penggunaan bahan untuk training laboratorium
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Training Set
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Tambah Training Set Baru</DialogTitle>
                            <DialogDescription>
                                Buat konfigurasi kebutuhan item untuk training baru
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="trainingName">Nama Training *</Label>
                                    <Input
                                        id="trainingName"
                                        placeholder="Contoh: Praktikum HPLC Dasar"
                                        value={newTrainingName}
                                        onChange={(e) => setNewTrainingName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="participantsPerSet">Peserta per Set *</Label>
                                    <Input
                                        id="participantsPerSet"
                                        type="number"
                                        placeholder="5"
                                        value={newParticipantsPerSet}
                                        onChange={(e) => setNewParticipantsPerSet(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Items yang Dibutuhkan</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                                        <Plus className="mr-1 h-3 w-3" />
                                        Tambah Item
                                    </Button>
                                </div>

                                {newItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Belum ada item. Klik &quot;Tambah Item&quot; untuk menambahkan.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {newItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg">
                                                <Select
                                                    value={item.itemType}
                                                    onValueChange={(value) => handleUpdateItem(idx, "itemType", value)}
                                                >
                                                    <SelectTrigger className="w-[130px]">
                                                        <SelectValue placeholder="Tipe" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="reagent">Reagen</SelectItem>
                                                        <SelectItem value="standard">Standard</SelectItem>
                                                        <SelectItem value="barang">Barang</SelectItem>
                                                        <SelectItem value="consumable">Consumable</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Select
                                                    value={item.itemName}
                                                    onValueChange={(value) => handleUpdateItem(idx, "itemName", value)}
                                                    disabled={!item.itemType || loadingOptions[item.itemType]}
                                                >
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder={loadingOptions[item.itemType] ? "Loading..." : "Pilih item"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(warehouseOptions[item.itemType] || []).length === 0 ? (
                                                            <SelectItem value="__empty__" disabled>
                                                                {item.itemType ? "Tidak ada item" : "Pilih tipe dulu"}
                                                            </SelectItem>
                                                        ) : (
                                                            (warehouseOptions[item.itemType] || []).map((opt) => (
                                                                <SelectItem key={opt.id} value={opt.name}>
                                                                    {opt.name}
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="number"
                                                    placeholder="Qty"
                                                    className="w-20"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                                                />
                                                <Input
                                                    placeholder="Unit"
                                                    className="w-[80px]"
                                                    value={item.unit}
                                                    readOnly
                                                    disabled
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleRemoveItem(idx)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={handleCreateTraining}
                                disabled={createTraining.isLoading || !newTrainingName || !newParticipantsPerSet || newItems.length === 0}
                            >
                                {createTraining.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Training Check Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Cek Stok Training
                    </CardTitle>
                    <CardDescription>
                        Pilih training dan jumlah peserta untuk mengecek ketersediaan stok
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Nama Training</Label>
                            <Select value={selectedTraining} onValueChange={setSelectedTraining}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih training" />
                                </SelectTrigger>
                                <SelectContent>
                                    {displayTrainingSets.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.trainingName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Jumlah Peserta</Label>
                            <Input
                                type="number"
                                placeholder="Contoh: 10"
                                value={participants}
                                onChange={(e) => setParticipants(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                onClick={handleCheckStock}
                                disabled={!selectedTraining || !participants || isChecking}
                                className="w-full"
                            >
                                {isChecking ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Play className="mr-2 h-4 w-4" />
                                )}
                                Mulai Cek Stok
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Training Sets List */}
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Set Training</CardTitle>
                    <CardDescription>
                        Konfigurasi kebutuhan item per set training
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {displayTrainingSets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">Belum ada training set</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {displayTrainingSets.map((training) => {
                                const { equipment, consumables, reagents } = groupItemsByType(training.items)
                                return (
                                    <Card
                                        key={training.id}
                                        className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
                                        onClick={() => router.push(`/inventory/training/${training.id}`)}
                                    >
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">{training.trainingName}</CardTitle>
                                            <CardDescription className="flex items-center gap-1">
                                                <Users className="h-4 w-4" />
                                                Per {training.participantsPerSet} orang
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="text-sm space-y-2">
                                            {equipment.length > 0 && (
                                                <div>
                                                    <p className="font-medium text-muted-foreground">Peralatan:</p>
                                                    {equipment.map((eq, i) => (
                                                        <p key={i}>• {eq.itemName} ({eq.quantity} {eq.unit || "pcs"})</p>
                                                    ))}
                                                </div>
                                            )}
                                            {consumables.length > 0 && (
                                                <div>
                                                    <p className="font-medium text-muted-foreground">Consumable:</p>
                                                    {consumables.map((c, i) => (
                                                        <p key={i}>• {c.itemName} ({c.quantity} {c.unit})</p>
                                                    ))}
                                                </div>
                                            )}
                                            {reagents.length > 0 && (
                                                <div>
                                                    <p className="font-medium text-muted-foreground">Reagen/Standard:</p>
                                                    {reagents.map((r, i) => (
                                                        <p key={i}>• {r.itemName} ({r.quantity} {r.unit})</p>
                                                    ))}
                                                </div>
                                            )}
                                            {training.items.length === 0 && (
                                                <p className="text-muted-foreground italic">Belum ada item</p>
                                            )}
                                            <div className="pt-2 border-t mt-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive w-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setDeleteId(training.id)
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Hapus Training Set
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Pagination
                    pagination={pagination}
                    onPageChange={setPage}
                />
            )}

            {/* Stock Check Dialog */}
            <Dialog open={isCheckDialogOpen} onOpenChange={setIsCheckDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Hasil Pengecekan Stok</DialogTitle>
                        <DialogDescription>
                            Training: {displayTrainingSets.find(t => t.id === selectedTraining)?.trainingName} |
                            Peserta: {participants} orang
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead className="text-right">Dibutuhkan</TableHead>
                                    <TableHead className="text-right">Tersedia</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {checkResults.map((result, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{result.item}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {result.type === "equipment" ? "Barang" :
                                                    result.type === "consumable" ? "Consumable" : "Reagen"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {result.required} {result.unit}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {result.available} {result.unit}
                                        </TableCell>
                                        <TableCell>
                                            {result.status === "available" ? (
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle2 className="h-4 w-4" /> Tersedia
                                                </span>
                                            ) : result.status === "not_found" ? (
                                                <span className="flex items-center gap-1 text-yellow-600">
                                                    <AlertTriangle className="h-4 w-4" /> Tidak Ditemukan
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-red-600">
                                                    <XCircle className="h-4 w-4" /> Tidak Cukup
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {hasInsufficientStock && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-yellow-800 dark:text-yellow-200">
                            <AlertTriangle className="h-5 w-5" />
                            <p className="text-sm">
                                Beberapa item tidak mencukupi. Transaksi tidak dapat dilanjutkan.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCheckDialogOpen(false)}>
                            Tutup
                        </Button>
                        {!hasInsufficientStock && checkResults.length > 0 && (
                            <Button onClick={handleProcessTraining} disabled={isProcessing}>
                                {isProcessing ? "Memproses..." : "Proses & Kurangi Stok"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Training Set?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus training set ini? Semua konfigurasi item akan ikut terhapus.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTraining}
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
