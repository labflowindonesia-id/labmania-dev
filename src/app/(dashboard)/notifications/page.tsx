"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Bell, Calendar, AlertTriangle, CheckCircle, Loader2, RefreshCw, ExternalLink, Check } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { useRouter } from "next/navigation"

interface Notification {
    id: string
    type: 'calibration_h30' | 'expired_h30' | 'maintenance_reminder' | 'calibration_scheduled'
    title: string
    message: string
    referenceId: string
    referenceType: 'instrument' | 'chemical'
    actionUrl: string | null
    isRead: boolean
    webhookSent: boolean
    dueDate: string | null
    createdAt: string
}

interface NotificationResponse {
    data: Notification[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
    unreadCount: number
}

const typeConfig = {
    calibration_h30: {
        label: "Kalibrasi H-30",
        icon: Calendar,
        color: "text-blue-500",
        bgColor: "bg-blue-50 dark:bg-blue-950",
        badgeVariant: "secondary" as const
    },
    expired_h30: {
        label: "Expired H-30",
        icon: AlertTriangle,
        color: "text-red-500",
        bgColor: "bg-red-50 dark:bg-red-950",
        badgeVariant: "destructive" as const
    },
    maintenance_reminder: {
        label: "Maintenance",
        icon: AlertTriangle,
        color: "text-yellow-500",
        bgColor: "bg-yellow-50 dark:bg-yellow-950",
        badgeVariant: "secondary" as const
    },
    calibration_scheduled: {
        label: "Terjadwalkan",
        icon: CheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-50 dark:bg-green-950",
        badgeVariant: "default" as const
    },
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function NotificationsPage() {
    const router = useRouter()
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [readFilter, setReadFilter] = useState<string>("all")
    const [page, setPage] = useState(1)
    const [schedulingId, setSchedulingId] = useState<string | null>(null)
    const [isScheduling, setIsScheduling] = useState(false)
    const [confirmSchedule, setConfirmSchedule] = useState<Notification | null>(null)

    // Build URL with filters
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', '10')
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (readFilter !== 'all') params.set('isRead', readFilter === 'read' ? 'true' : 'false')

    const { data, isLoading, error, mutate } = useSWR<NotificationResponse>(
        `/api/notifications?${params.toString()}`,
        fetcher,
        {
            refreshInterval: 60000, // Refresh every 60 seconds (was 30s)
            dedupingInterval: 30000, // Prevent duplicate requests within 30 seconds
            revalidateOnFocus: false, // Don't refetch on window focus
        }
    )

    const handleMarkAsRead = useCallback(async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
            mutate()
        } catch (err) {
            console.error('Error marking as read:', err)
        }
    }, [mutate])

    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await fetch('/api/notifications', { method: 'PATCH' })
            mutate()
        } catch (err) {
            console.error('Error marking all as read:', err)
        }
    }, [mutate])

    const handleScheduleCalibration = useCallback(async (notification: Notification) => {
        setIsScheduling(true)
        setSchedulingId(notification.id)

        try {
            const response = await fetch('/api/notifications/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instrumentId: notification.referenceId }),
            })

            if (!response.ok) {
                throw new Error('Failed to schedule calibration')
            }

            // Mark notification as read
            await handleMarkAsRead(notification.id)
            mutate()
            setConfirmSchedule(null)
        } catch (err) {
            console.error('Error scheduling calibration:', err)
        } finally {
            setIsScheduling(false)
            setSchedulingId(null)
        }
    }, [handleMarkAsRead, mutate])

    const formatDate = useCallback((dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }, [])

    const formatTime = useCallback((dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }, [])

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Memuat notifikasi...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <p className="text-destructive mb-4">Gagal memuat notifikasi</p>
                <Button onClick={() => mutate()} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Coba Lagi
                </Button>
            </div>
        )
    }

    const notifications = data?.data || []
    const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    const unreadCount = data?.unreadCount || 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Bell className="h-8 w-8" />
                        Notifikasi
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="text-sm">
                                {unreadCount} belum dibaca
                            </Badge>
                        )}
                    </h1>
                    <p className="text-muted-foreground">
                        Notifikasi sistem untuk kalibrasi dan expired items
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" onClick={handleMarkAllAsRead}>
                        <Check className="h-4 w-4 mr-2" />
                        Tandai Semua Dibaca
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        <SelectItem value="calibration_h30">Kalibrasi H-30</SelectItem>
                        <SelectItem value="expired_h30">Expired H-30</SelectItem>
                        <SelectItem value="calibration_scheduled">Terjadwalkan</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={readFilter} onValueChange={setReadFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="unread">Belum Dibaca</SelectItem>
                        <SelectItem value="read">Sudah Dibaca</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Notification List */}
            <div className="space-y-3">
                {notifications.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">Tidak ada notifikasi</p>
                        </CardContent>
                    </Card>
                ) : (
                    notifications.map((notification) => {
                        const config = typeConfig[notification.type] || typeConfig.calibration_h30
                        const Icon = config.icon

                        return (
                            <Card
                                key={notification.id}
                                className={`transition-colors ${!notification.isRead ? 'border-l-4 border-l-primary bg-muted/30' : ''}`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`rounded-full p-2 ${config.bgColor}`}>
                                                <Icon className={`h-5 w-5 ${config.color}`} />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{notification.title}</h3>
                                                    <Badge variant={config.badgeVariant}>
                                                        {config.label}
                                                    </Badge>
                                                    {notification.webhookSent && (
                                                        <Badge variant="default" className="bg-green-500">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Terkirim
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {notification.message}
                                                </p>
                                                {notification.dueDate && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Jatuh tempo: {formatDate(notification.dueDate)}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(notification.createdAt)} {formatTime(notification.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {/* Show "Jadwalkan Sekarang" button for calibration notifications */}
                                            {notification.type === 'calibration_h30' &&
                                                notification.referenceType === 'instrument' &&
                                                !notification.webhookSent && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setConfirmSchedule(notification)}
                                                        disabled={isScheduling && schedulingId === notification.id}
                                                    >
                                                        {isScheduling && schedulingId === notification.id ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Calendar className="h-4 w-4 mr-2" />
                                                        )}
                                                        Jadwalkan Sekarang
                                                    </Button>
                                                )}
                                            {notification.actionUrl && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        handleMarkAsRead(notification.id)
                                                        router.push(notification.actionUrl!)
                                                    }}
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Lihat Detail
                                                </Button>
                                            )}
                                            {!notification.isRead && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                >
                                                    <Check className="h-4 w-4 mr-2" />
                                                    Tandai Dibaca
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Pagination
                    pagination={pagination}
                    onPageChange={setPage}
                />
            )}

            {/* Confirmation Dialog */}
            <AlertDialog open={!!confirmSchedule} onOpenChange={() => setConfirmSchedule(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Jadwalkan Kalibrasi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan mengirimkan notifikasi email ke vendor kalibrasi untuk instrumen{' '}
                            <strong>{confirmSchedule?.title.replace('Kalibrasi ', '')}</strong>.
                            <br /><br />
                            Status instrumen akan berubah menjadi &quot;Sudah Dijadwalkan&quot;.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isScheduling}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmSchedule && handleScheduleCalibration(confirmSchedule)}
                            disabled={isScheduling}
                        >
                            {isScheduling ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Calendar className="h-4 w-4 mr-2" />
                            )}
                            Ya, Jadwalkan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
