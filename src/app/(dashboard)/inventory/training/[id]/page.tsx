"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { ArrowLeft, Edit, Users, Package, FlaskConical, Beaker, Plus, Trash2, Loader2, RefreshCw, TestTube2 } from "lucide-react"
import { useFetch } from "@/hooks/use-api"

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

export default function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const resolvedParams = use(params)

    // Fetch training set from API
    const { data, isLoading, error, refetch } = useFetch<{ trainingSet: TrainingSet }>(
        `/api/inventory/training/${resolvedParams.id}`
    )

    const training = data?.trainingSet

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editedName, setEditedName] = useState("")
    const [editedParticipants, setEditedParticipants] = useState("")
    const [editedItems, setEditedItems] = useState<{ itemType: string; itemName: string; quantity: string; unit: string }[]>([])
    const [isSaving, setIsSaving] = useState(false)

    // Warehouse options for dropdowns
    const [warehouseOptions, setWarehouseOptions] = useState<Record<string, { id: string; name: string; unit: string }[]>>({})
    const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({})

    // Initialize edit form when dialog opens
    const handleOpenEditDialog = () => {
        if (training) {
            setEditedName(training.trainingName)
            setEditedParticipants(training.participantsPerSet.toString())
            const items = training.items.map(item => ({
                itemType: item.itemType,
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit || ""
            }))
            setEditedItems(items)

            // Fetch warehouse options for all unique item types from existing items
            const uniqueTypes = [...new Set(items.map(i => i.itemType).filter(Boolean))]
            uniqueTypes.forEach(type => {
                fetchWarehouseOptions(type)
            })
        }
        setIsEditDialogOpen(true)
    }

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
        setEditedItems([...editedItems, { itemType: "", itemName: "", quantity: "", unit: "" }])
    }

    const handleRemoveItem = (index: number) => {
        setEditedItems(editedItems.filter((_, i) => i !== index))
    }

    const handleUpdateItem = async (index: number, field: string, value: string) => {
        const updated = [...editedItems]
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

        setEditedItems(updated)
    }

    const handleSaveEdit = async () => {
        if (!training) return

        setIsSaving(true)
        try {
            const response = await fetch(`/api/inventory/training/${training.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trainingName: editedName,
                    participantsPerSet: parseInt(editedParticipants),
                    items: editedItems.filter(item => item.itemName && item.quantity)
                }),
            })

            if (response.ok) {
                setIsEditDialogOpen(false)
                refetch()
            } else {
                const data = await response.json()
                alert(`Gagal menyimpan: ${data.error}`)
            }
        } catch (err) {
            console.error("Save error:", err)
            alert("Terjadi kesalahan saat menyimpan")
        } finally {
            setIsSaving(false)
        }
    }

    // Group items by type for display
    const groupItemsByType = (items: TrainingSetItem[]) => {
        const equipment = items.filter(i => i.itemType === "barang" || i.itemType === "equipment")
        const consumables = items.filter(i => i.itemType === "consumable")
        const reagents = items.filter(i => i.itemType === "reagent" || i.itemType === "standard" || i.itemType === "reagent_standard")
        const samples = items.filter(i => i.itemType === "sample")
        return { equipment, consumables, reagents, samples }
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
            <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Gagal memuat training</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <div className="flex gap-2">
                    <Button onClick={() => router.back()} variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali
                    </Button>
                    <Button onClick={refetch}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Coba Lagi
                    </Button>
                </div>
            </div>
        )
    }

    if (!training) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Training tidak ditemukan</h2>
                <p className="text-muted-foreground mb-4">ID: {resolvedParams.id}</p>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Kembali
                </Button>
            </div>
        )
    }

    const { equipment, consumables, reagents, samples } = groupItemsByType(training.items)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{training.trainingName}</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Kapasitas: {training.participantsPerSet} orang per set
                        </p>
                    </div>
                </div>
                <Button onClick={handleOpenEditDialog}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Training
                </Button>
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Equipment Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-500" />
                            Peralatan
                        </CardTitle>
                        <CardDescription>Daftar peralatan yang dibutuhkan</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {equipment.length > 0 ? (
                            <ul className="space-y-2">
                                {equipment.map((eq, i) => (
                                    <li key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <span>{eq.itemName}</span>
                                        <span className="font-medium text-blue-600">{eq.quantity} {eq.unit || "pcs"}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">Tidak ada peralatan</p>
                        )}
                    </CardContent>
                </Card>

                {/* Consumables Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Beaker className="h-5 w-5 text-green-500" />
                            Consumable
                        </CardTitle>
                        <CardDescription>Bahan habis pakai</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {consumables.length > 0 ? (
                            <ul className="space-y-2">
                                {consumables.map((c, i) => (
                                    <li key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <span>{c.itemName}</span>
                                        <span className="font-medium text-green-600">{c.quantity} {c.unit}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">Tidak ada consumable</p>
                        )}
                    </CardContent>
                </Card>

                {/* Reagents Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FlaskConical className="h-5 w-5 text-purple-500" />
                            Reagen & Standard
                        </CardTitle>
                        <CardDescription>Bahan kimia dan larutan standar</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {reagents.length > 0 ? (
                            <ul className="space-y-2">
                                {reagents.map((r, i) => (
                                    <li key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <span>{r.itemName}</span>
                                        <span className="font-medium text-purple-600">{r.quantity} {r.unit}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">Tidak ada reagen/standard</p>
                        )}
                    </CardContent>
                </Card>

                {/* Samples Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TestTube2 className="h-5 w-5 text-amber-500" />
                            Sample
                        </CardTitle>
                        <CardDescription>Sampel untuk quality control</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {samples.length > 0 ? (
                            <ul className="space-y-2">
                                {samples.map((s, i) => (
                                    <li key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <span>{s.itemName}</span>
                                        <span className="font-medium text-amber-600">{s.quantity} {s.unit}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">Tidak ada sample</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Training Set</DialogTitle>
                        <DialogDescription>
                            Modifikasi detail dan kebutuhan training
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="trainingName">Nama Training</Label>
                                <Input
                                    id="trainingName"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="participants">Peserta per Set</Label>
                                <Input
                                    id="participants"
                                    type="number"
                                    value={editedParticipants}
                                    onChange={(e) => setEditedParticipants(e.target.value)}
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

                            {editedItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Belum ada item. Klik &quot;Tambah Item&quot; untuk menambahkan.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {editedItems.map((item, idx) => (
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
                                                    <SelectItem value="sample">Sample</SelectItem>
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
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
