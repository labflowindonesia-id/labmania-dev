"use client"

import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, ShoppingCart, Check, X, Loader2, RefreshCw, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
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
import { OrderStatus } from "@/types"
import { useFetch, useMutation } from "@/hooks/use-api"

interface OrderItem {
    id: string
    itemName: string
    quantity: number
    unit?: string
    notes?: string
}

interface Order {
    id: string
    orderNumber: string
    orderDate: string
    orderedBy: string
    orderedByUser?: { fullName: string }
    status: OrderStatus
    items: OrderItem[]
    approvedBy?: string
    approvedByUser?: { fullName: string }
    approvedDate?: string
    notes?: string
}

const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Menunggu Approval", variant: "secondary" },
    approved: { label: "Disetujui", variant: "default" },
    rejected: { label: "Ditolak", variant: "destructive" },
    received: { label: "Diterima", variant: "outline" },
    cancelled: { label: "Dibatalkan", variant: "outline" },
}

export default function OrdersPage() {
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newOrderItems, setNewOrderItems] = useState("")
    const [newOrderNotes, setNewOrderNotes] = useState("")
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const toggleExpand = (orderId: string) => {
        const newExpanded = new Set(expandedOrders)
        if (newExpanded.has(orderId)) {
            newExpanded.delete(orderId)
        } else {
            newExpanded.add(orderId)
        }
        setExpandedOrders(newExpanded)
    }

    // Fetch orders from API
    const { data: orders, isLoading, error, refetch } = useFetch<Order[]>("/api/inventory/orders")

    // Mutations
    const createOrder = useMutation<Order, { items: { itemName: string; quantity: number }[]; notes?: string }>(
        "/api/inventory/orders",
        "POST",
        {
            onSuccess: () => {
                refetch()
                setIsAddDialogOpen(false)
                setNewOrderItems("")
                setNewOrderNotes("")
            },
        }
    )

    const approveOrder = useMutation<Order, { action: string }>(
        "/api/inventory/orders",
        "POST",
        { onSuccess: () => refetch() }
    )

    const handleCreateOrder = async () => {
        // Parse items from textarea
        const lines = newOrderItems.split("\n").filter(line => line.trim())
        const items = lines.map(line => {
            // Parse format: "- Item name x quantity" or "Item name x quantity"
            const cleanLine = line.replace(/^[-•]\s*/, "").trim()
            const match = cleanLine.match(/(.+?)\s*[xX]\s*(\d+)$/)
            if (match) {
                return { itemName: match[1].trim(), quantity: parseInt(match[2]) }
            }
            return { itemName: cleanLine, quantity: 1 }
        })

        if (items.length > 0) {
            await createOrder.mutate({ items, notes: newOrderNotes || undefined })
        }
    }

    const handleApprove = async (orderId: string) => {
        await fetch(`/api/inventory/orders/${orderId}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "approve" }),
        })
        refetch()
    }

    const handleReject = async (orderId: string) => {
        await fetch(`/api/inventory/orders/${orderId}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reject" }),
        })
        refetch()
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/inventory/orders/${deleteId}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Gagal menghapus")
            refetch()
        } catch (err) {
            console.error(err)
        } finally {
            setIsDeleting(false)
            setDeleteId(null)
        }
    }

    const filteredOrders = (orders || []).filter((order) => {
        const orderedByName = order.orderedByUser?.fullName || ""
        const matchesSearch = order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
            orderedByName.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === "all" || order.status === statusFilter
        return matchesSearch && matchesStatus
    })

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Memuat data pesanan...</span>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
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
                    <h1 className="text-3xl font-bold tracking-tight">Pesanan</h1>
                    <p className="text-muted-foreground">
                        Kelola pesanan bahan dan peralatan laboratorium
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Buat Pesanan
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Buat Pesanan Baru</DialogTitle>
                            <DialogDescription>
                                Tambahkan item yang akan dipesan
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="items">Item yang Dipesan</Label>
                                <Textarea
                                    id="items"
                                    placeholder="Contoh:&#10;- Methanol HPLC Grade 2.5L x 5&#10;- Fintip 100-1000 µL x 10"
                                    rows={5}
                                    value={newOrderItems}
                                    onChange={(e) => setNewOrderItems(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Catatan</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Catatan tambahan (opsional)"
                                    rows={3}
                                    value={newOrderNotes}
                                    onChange={(e) => setNewOrderNotes(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={handleCreateOrder}
                                disabled={createOrder.isLoading || !newOrderItems.trim()}
                            >
                                {createOrder.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Kirim Pesanan
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
                        placeholder="Cari nomor order atau nama..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="pending">Menunggu Approval</SelectItem>
                        <SelectItem value="approved">Disetujui</SelectItem>
                        <SelectItem value="received">Diterima</SelectItem>
                        <SelectItem value="rejected">Ditolak</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>No. Order</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Dipesan Oleh</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Disetujui Oleh</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                <TableCell>{new Date(order.orderDate).toLocaleDateString("id-ID")}</TableCell>
                                <TableCell>{order.orderedByUser?.fullName || "-"}</TableCell>
                                <TableCell>
                                    <div className="max-w-[250px]">
                                        {(expandedOrders.has(order.id) ? order.items : order.items.slice(0, 2)).map((item, idx) => (
                                            <p key={idx} className="text-sm truncate">
                                                • {item.itemName} x{item.quantity}
                                            </p>
                                        ))}
                                        {order.items.length > 2 && (
                                            <button
                                                onClick={() => toggleExpand(order.id)}
                                                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                                            >
                                                {expandedOrders.has(order.id) ? (
                                                    <>
                                                        <ChevronUp className="h-3 w-3" />
                                                        Sembunyikan
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="h-3 w-3" />
                                                        +{order.items.length - 2} item lainnya
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={statusConfig[order.status].variant}>
                                        {statusConfig[order.status].label}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {order.approvedByUser?.fullName || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {order.status === "pending" && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-green-600"
                                                    onClick={() => handleApprove(order.id)}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleReject(order.id)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeleteId(order.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {filteredOrders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Tidak ada pesanan ditemukan</p>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Pesanan?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus pesanan ini? Tindakan ini tidak dapat dibatalkan.
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
