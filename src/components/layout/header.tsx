"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"

// Mapping dari path segment ke label Indonesia
const pathLabels: Record<string, string> = {
    inventory: "Inventory",
    reagents: "Katalog Reagen",
    standards: "Katalog Standard",
    items: "Katalog Barang",
    "warehouse-chemicals": "Gudang Kimia",
    "warehouse-items": "Gudang Barang",
    "usage-logs": "Log Penggunaan",
    orders: "Pesanan",
    training: "Training Usage",
    instruments: "Instrumen",
    database: "Database",
    "calibration-logs": "Log Kalibrasi",
    maintenance: "Maintenance",
    chat: "Chat AI",
    notifications: "Notifikasi",
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function Header() {
    const pathname = usePathname()
    const segments = pathname.split("/").filter(Boolean)

    // Fetch unread notification count - with deduplication to prevent excessive API calls
    const { data } = useSWR('/api/notifications?limit=1', fetcher, {
        refreshInterval: 120000, // Refresh every 2 minutes (was 60s)
        dedupingInterval: 60000, // Prevent duplicate requests within 1 minute
        revalidateOnFocus: false, // Don't refetch on window focus
    })
    const unreadCount = data?.unreadCount || 0

    // Generate breadcrumb items
    const breadcrumbItems = segments.map((segment, index) => {
        const path = "/" + segments.slice(0, index + 1).join("/")
        const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
        const isLast = index === segments.length - 1

        return { path, label, isLast }
    })

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            {pathname === "/" ? (
                                <BreadcrumbPage>Dashboard</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link href="/">Dashboard</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {breadcrumbItems.map((item) => (
                            <span key={item.path} className="flex items-center gap-2">
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    {item.isLast ? (
                                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link href={item.path}>{item.label}</Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </span>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Notification Bell */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" asChild className="relative">
                    <Link href="/notifications">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-[10px] font-medium text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </Link>
                </Button>
            </div>
        </header>
    )
}
