"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { Plus, Search, Users, Edit, Trash2, Loader2, RefreshCw, Shield } from "lucide-react"
import { useFetchPaginated, useMutation } from "@/hooks/use-api"
import { Pagination } from "@/components/ui/pagination"

interface User {
    id: string
    username: string
    fullName: string
    role: 'admin' | 'manager' | 'analyst'
    createdAt: string
    updatedAt: string
}

type UserRole = 'admin' | 'manager' | 'analyst'

const roleConfig: Record<UserRole, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    admin: { label: "Admin", variant: "destructive" },
    manager: { label: "Manager", variant: "default" },
    analyst: { label: "Analyst", variant: "secondary" },
}

export default function AdminUsersPage() {
    const [roleFilter, setRoleFilter] = useState<string>("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)

    // Form state for create
    const [createForm, setCreateForm] = useState({
        username: "",
        password: "",
        fullName: "",
        role: "analyst" as UserRole,
    })

    // Form state for edit
    const [editForm, setEditForm] = useState({
        username: "",
        fullName: "",
        role: "analyst" as UserRole,
    })

    // Fetch users from API with pagination
    const { data: users, pagination, isLoading, error, refetch, search, setSearch, setPage } = useFetchPaginated<User>(
        "/api/admin/users",
        { role: roleFilter }
    )
    const displayUsers = users || []

    // Create mutation
    const createMutation = useMutation<User, typeof createForm>(
        "/api/admin/users",
        "POST",
        {
            onSuccess: () => {
                setIsAddDialogOpen(false)
                setCreateForm({ username: "", password: "", fullName: "", role: "analyst" })
                refetch()
            }
        }
    )

    // Update mutation
    const updateMutation = useMutation<User, typeof editForm>(
        `/api/admin/users/${selectedUser?.id}`,
        "PUT",
        {
            onSuccess: () => {
                setIsEditDialogOpen(false)
                setSelectedUser(null)
                refetch()
            }
        }
    )

    // Delete mutation
    const deleteMutation = useMutation<{ success: boolean }, never>(
        `/api/admin/users/${selectedUser?.id}`,
        "DELETE",
        {
            onSuccess: () => {
                setIsDeleteDialogOpen(false)
                setSelectedUser(null)
                refetch()
            }
        }
    )

    const handleCreate = async () => {
        if (!createForm.username || !createForm.password || !createForm.fullName) return
        await createMutation.mutate(createForm)
    }

    const handleEdit = (user: User) => {
        setSelectedUser(user)
        setEditForm({
            username: user.username,
            fullName: user.fullName,
            role: user.role,
        })
        setIsEditDialogOpen(true)
    }

    const handleUpdate = async () => {
        if (!editForm.fullName) return
        await updateMutation.mutate(editForm)
    }

    const handleDelete = (user: User) => {
        setSelectedUser(user)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        await deleteMutation.mutate({} as never)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Memuat data pengguna...</p>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Shield className="h-12 w-12 text-destructive mb-4" />
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
                    <h1 className="text-3xl font-bold tracking-tight">Manajemen User</h1>
                    <p className="text-muted-foreground">
                        Kelola pengguna dan hak akses sistem
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tambah User Baru</DialogTitle>
                            <DialogDescription>
                                Buat akun pengguna baru untuk sistem LIMS
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username *</Label>
                                <Input
                                    id="username"
                                    placeholder="Contoh: analyst1"
                                    value={createForm.username}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password *</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Minimal 6 karakter"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nama Lengkap *</Label>
                                <Input
                                    id="fullName"
                                    placeholder="Contoh: Dr. Ahmad Suryadi"
                                    value={createForm.fullName}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role *</Label>
                                <Select
                                    value={createForm.role}
                                    onValueChange={(value: UserRole) => setCreateForm(prev => ({ ...prev, role: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin - Akses penuh</SelectItem>
                                        <SelectItem value="manager">Manager - Approval & laporan</SelectItem>
                                        <SelectItem value="analyst">Analyst - Input data</SelectItem>
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
                            <Button onClick={handleCreate} disabled={createMutation.isLoading}>
                                {createMutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Admin</CardTitle>
                        <Shield className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Manager</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.filter(u => u.role === 'manager').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Analysts</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.filter(u => u.role === 'analyst').length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Cari user..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pengguna</CardTitle>
                    <CardDescription>
                        {displayUsers.length} pengguna ditemukan
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Nama Lengkap</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Terdaftar</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Tidak ada pengguna ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.username}</TableCell>
                                        <TableCell>{user.fullName}</TableCell>
                                        <TableCell>
                                            <Badge variant={roleConfig[user.role]?.variant || "secondary"}>
                                                {roleConfig[user.role]?.label || user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(user)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(user)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Pagination
                    pagination={pagination}
                    onPageChange={setPage}
                />
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Ubah informasi pengguna
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-username">Username</Label>
                            <Input
                                id="edit-username"
                                value={editForm.username}
                                onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-fullName">Nama Lengkap *</Label>
                            <Input
                                id="edit-fullName"
                                value={editForm.fullName}
                                onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Role *</Label>
                            <Select
                                value={editForm.role}
                                onValueChange={(value: UserRole) => setEditForm(prev => ({ ...prev, role: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="analyst">Analyst</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {updateMutation.error && (
                            <p className="text-sm text-destructive">{updateMutation.error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isLoading}>
                            {updateMutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus User?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus user <strong>{selectedUser?.fullName}</strong>?
                            Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
