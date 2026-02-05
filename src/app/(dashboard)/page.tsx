"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import useSWR from "swr"
import dynamic from "next/dynamic"
import { addDays } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package, Clock, Wrench, TrendingUp } from "lucide-react"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { useAuth } from "@/components/providers/auth-provider"
import type { ScheduleEvent } from "@/components/dashboard/monthly-calendar"

// Lazy load calendar components to reduce initial bundle size
const WeeklyCalendar = dynamic(
    () => import("@/components/dashboard/weekly-calendar").then(mod => ({ default: mod.WeeklyCalendar })),
    { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-muted rounded-lg" /> }
)
const MonthlyCalendar = dynamic(
    () => import("@/components/dashboard/monthly-calendar").then(mod => ({ default: mod.MonthlyCalendar })),
    { ssr: false, loading: () => <div className="h-[300px] animate-pulse bg-muted rounded-lg" /> }
)


// Lazy load chart components to reduce initial bundle size
const InstrumentStatusChart = dynamic(
    () => import("@/components/dashboard/charts").then(mod => ({ default: mod.InstrumentStatusChart })),
    { ssr: false, loading: () => <div className="h-[250px] animate-pulse bg-muted rounded-lg" /> }
)
const InventoryStockChart = dynamic(
    () => import("@/components/dashboard/charts").then(mod => ({ default: mod.InventoryStockChart })),
    { ssr: false, loading: () => <div className="h-[250px] animate-pulse bg-muted rounded-lg" /> }
)
const MonthlyUsageChart = dynamic(
    () => import("@/components/dashboard/charts").then(mod => ({ default: mod.MonthlyUsageChart })),
    { ssr: false, loading: () => <div className="h-[250px] animate-pulse bg-muted rounded-lg" /> }
)

// Chart data types
interface InstrumentStatusDataItem {
    name: string
    value: number
    color: string
}

interface InventoryStockDataItem {
    category: string
    tersedia: number
    menipis: number
    habis: number
}

interface MonthlyUsageDataItem {
    month: string
    reagen: number
    consumable: number
}

interface DashboardData {
    stats: {
        expiredReagents: number
        lowStockItems: number
        outOfStockItems: number
        upcomingCalibrations: number
    }
    expiringReagents: Array<{
        id: string
        name: string
        daysLeft: number
        location: string
    }>
    upcomingCalibrations: Array<{
        id: string
        name: string
        daysLeft: number
        status: string
    }>
    scheduleEvents: ScheduleEvent[]
    instrumentStatusData: InstrumentStatusDataItem[]
    inventoryStockData: InventoryStockDataItem[]
    monthlyUsageData: MonthlyUsageDataItem[]
}


// Default mock schedule events (fallback)
const defaultScheduleEvents: ScheduleEvent[] = [
    {
        id: "1",
        title: "HPLC Kalibrasi",
        date: addDays(new Date(), 2),
        type: "calibration",
        instrumentName: "HPLC Agilent 1260",
        location: "Lab Analisis",
        description: "Kalibrasi rutin HPLC untuk memastikan akurasi pengukuran"
    },
    {
        id: "2",
        title: "GC-MS Maintenance",
        date: addDays(new Date(), 3),
        type: "maintenance",
        instrumentName: "GC-MS Shimadzu",
        location: "Lab Organik",
        description: "Pemeliharaan berkala dan penggantian kolom"
    },
]

// Default fallback chart data
const defaultInstrumentStatusData = [
    { name: "Terkalibrasi", value: 0, color: "#22c55e" },
    { name: "Jadwal Mendatang", value: 0, color: "#3b82f6" },
    { name: "Lewat Jatuh Tempo", value: 0, color: "#ef4444" },
    { name: "Dalam Perbaikan", value: 0, color: "#eab308" },
]

const defaultInventoryStockData = [
    { category: "Reagen", tersedia: 0, menipis: 0, habis: 0 },
    { category: "Standard", tersedia: 0, menipis: 0, habis: 0 },
    { category: "Barang", tersedia: 0, menipis: 0, habis: 0 },
    { category: "Consumable", tersedia: 0, menipis: 0, habis: 0 },
]

const defaultMonthlyUsageData = [
    { month: "Sep", reagen: 0, consumable: 0 },
    { month: "Okt", reagen: 0, consumable: 0 },
    { month: "Nov", reagen: 0, consumable: 0 },
    { month: "Des", reagen: 0, consumable: 0 },
]

// Default dashboard data for fallback
const defaultDashboardData: DashboardData = {
    stats: {
        expiredReagents: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        upcomingCalibrations: 0,
    },
    expiringReagents: [],
    upcomingCalibrations: [],
    scheduleEvents: defaultScheduleEvents,
    instrumentStatusData: defaultInstrumentStatusData,
    inventoryStockData: defaultInventoryStockData,
    monthlyUsageData: defaultMonthlyUsageData,
}

// SWR fetcher with proper data parsing
const dashboardFetcher = async (url: string): Promise<DashboardData> => {
    console.log('[Dashboard] SWR fetching data...')
    const startTime = Date.now()

    const response = await fetch(url)

    if (!response.ok) {
        console.log('[Dashboard] Response not ok, using fallback')
        return defaultDashboardData
    }

    const data = await response.json()
    console.log(`[Dashboard] Data received in ${Date.now() - startTime}ms, events count:`, data.scheduleEvents?.length)

    // Parse schedule events with proper date conversion
    const parsedEvents = data.scheduleEvents?.map((e: { id: string; title: string; date: string; type: string; location?: string; description?: string }) => ({
        ...e,
        date: new Date(e.date + 'T00:00:00'), // Ensure proper date parsing
    })) || defaultScheduleEvents

    return {
        ...data,
        scheduleEvents: parsedEvents.length > 0 ? parsedEvents : defaultScheduleEvents,
        instrumentStatusData: data.instrumentStatusData?.length ? data.instrumentStatusData : defaultInstrumentStatusData,
        inventoryStockData: data.inventoryStockData?.length ? data.inventoryStockData : defaultInventoryStockData,
        monthlyUsageData: data.monthlyUsageData?.length ? data.monthlyUsageData : defaultMonthlyUsageData,
    }
}

export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth()

    // Use SWR for data fetching with caching and deduplication
    const { data: dashboardData, isLoading: dataLoading, error, mutate } = useSWR<DashboardData>(
        // Only fetch if user is authenticated
        user ? "/api/dashboard" : null,
        dashboardFetcher,
        {
            // Cache data for 60 seconds
            dedupingInterval: 60000,
            // Don't refetch on focus (reduce unnecessary requests)
            revalidateOnFocus: false,
            // Don't refetch on reconnect
            revalidateOnReconnect: false,
            // Use fallback data while loading
            fallbackData: defaultDashboardData,
            // Error retry config
            errorRetryCount: 2,
            errorRetryInterval: 1000,
            // Keep previous data while revalidating
            keepPreviousData: true,
        }
    )

    // Background H-30 check on dashboard load
    // This ensures notifications are created immediately when user opens dashboard
    useEffect(() => {
        // Only run if user is authenticated
        if (!user) return;

        // Check if H-30 check was already done this session (prevent spamming)
        const sessionKey = 'h30_check_done_' + new Date().toDateString();
        if (sessionStorage.getItem(sessionKey)) return;

        // Run H-30 check in background
        const triggerH30Check = async () => {
            try {
                console.log('[Dashboard] Triggering background H-30 check...');
                const response = await fetch('/api/notifications/check-h30', {
                    method: 'POST',
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('[Dashboard] H-30 check completed:', result);

                    // If new notifications were created, refresh dashboard data
                    if (result.totalCreated > 0) {
                        mutate(); // Revalidate SWR data
                    }

                    // Mark as done for this session/day
                    sessionStorage.setItem(sessionKey, 'true');
                }
            } catch (error) {
                console.log('[Dashboard] Background H-30 check failed (non-blocking):', error);
            }
        };

        // Run after a small delay to not block page load
        const timeoutId = setTimeout(triggerH30Check, 1000);

        return () => clearTimeout(timeoutId);
    }, [user, mutate]);

    // Show loading skeleton only during initial auth check
    const isLoading = authLoading || (dataLoading && !dashboardData)

    // Memoize stats data to prevent recalculation on every render
    const statsData = useMemo(() => [
        {
            title: "Bahan Kimia Expired",
            value: dashboardData?.stats.expiredReagents?.toString() || "0",
            description: "dalam 30 hari",
            icon: AlertTriangle,
            color: "text-red-500",
            bgColor: "bg-red-50 dark:bg-red-950",
        },
        {
            title: "Stok Menipis",
            value: dashboardData?.stats.lowStockItems?.toString() || "0",
            description: "di bawah minimum",
            icon: Package,
            color: "text-yellow-500",
            bgColor: "bg-yellow-50 dark:bg-yellow-950",
        },
        {
            title: "Stok Habis",
            value: dashboardData?.stats.outOfStockItems?.toString() || "0",
            description: "perlu restock",
            icon: Package,
            color: "text-gray-500",
            bgColor: "bg-gray-50 dark:bg-gray-900",
        },
        {
            title: "Kalibrasi Mendatang",
            value: dashboardData?.stats.upcomingCalibrations?.toString() || "0",
            description: "dalam 30 hari",
            icon: Clock,
            color: "text-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-950",
        },
    ], [dashboardData?.stats])

    // Memoize event handler to prevent re-creating function on every render
    const handleEventClick = useCallback((event: ScheduleEvent) => {
        console.log("Event clicked:", event)
    }, [])

    if (isLoading) {
        return <DashboardSkeleton />
    }

    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Selamat datang, <span className="font-medium">{user?.fullName || 'User'}</span> - LabFlow Assets
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statsData.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <div className={`rounded-full p-2 ${stat.bgColor}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">{stat.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Calendar Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Kalender Jadwal
                    </CardTitle>
                    <CardDescription>Jadwal kalibrasi, maintenance, dan reminder</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="weekly">
                        <TabsList className="mb-4">
                            <TabsTrigger value="weekly">Mingguan</TabsTrigger>
                            <TabsTrigger value="monthly">Bulanan</TabsTrigger>
                        </TabsList>
                        <TabsContent value="weekly">
                            <WeeklyCalendar
                                events={dashboardData?.scheduleEvents || defaultScheduleEvents}
                                onEventClick={handleEventClick}
                            />
                        </TabsContent>
                        <TabsContent value="monthly">
                            <MonthlyCalendar
                                events={dashboardData?.scheduleEvents || defaultScheduleEvents}
                                onEventClick={handleEventClick}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Instrument Status Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wrench className="h-5 w-5" />
                            Status Instrumen
                        </CardTitle>
                        <CardDescription>Distribusi status kalibrasi</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <InstrumentStatusChart data={dashboardData?.instrumentStatusData || defaultInstrumentStatusData} />
                    </CardContent>
                </Card>

                {/* Inventory Stock Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Status Stok Inventory
                        </CardTitle>
                        <CardDescription>Perbandingan status stok per kategori</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <InventoryStockChart data={dashboardData?.inventoryStockData || defaultInventoryStockData} />
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Usage Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Tren Penggunaan Bulanan
                    </CardTitle>
                    <CardDescription>Jumlah penggunaan reagen dan consumable</CardDescription>
                </CardHeader>
                <CardContent>
                    <MonthlyUsageChart data={dashboardData?.monthlyUsageData || defaultMonthlyUsageData} />
                </CardContent>
            </Card>

            {/* Quick Access Cards */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Expiring Reagents */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Bahan Kimia Mendekati Expired
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {(dashboardData?.expiringReagents || []).length > 0 ? (
                                dashboardData?.expiringReagents.map((reagent) => (
                                    <div
                                        key={reagent.id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">{reagent.name}</p>
                                            <p className="text-sm text-muted-foreground">{reagent.location}</p>
                                        </div>
                                        <Badge variant={reagent.daysLeft <= 7 ? "destructive" : "secondary"}>
                                            {reagent.daysLeft} hari
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Tidak ada bahan kimia mendekati expired</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Upcoming Calibrations */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Kalibrasi Mendatang
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {(dashboardData?.upcomingCalibrations || []).length > 0 ? (
                                dashboardData?.upcomingCalibrations.map((cal) => (
                                    <div
                                        key={cal.id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">{cal.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {cal.status === "scheduled" ? "Sudah dijadwalkan" : "Belum dijadwalkan"}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={cal.daysLeft < 0 ? "destructive" : cal.daysLeft < 30 ? "secondary" : "default"}
                                        >
                                            {cal.daysLeft < 0 ? `${Math.abs(cal.daysLeft)} hari lalu` : `${cal.daysLeft} hari`}
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Tidak ada kalibrasi mendatang</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
