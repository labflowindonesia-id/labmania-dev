"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
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
}

export function Header() {
    const pathname = usePathname()
    const segments = pathname.split("/").filter(Boolean)

    // Generate breadcrumb items
    const breadcrumbItems = segments.map((segment, index) => {
        const path = "/" + segments.slice(0, index + 1).join("/")
        const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
        const isLast = index === segments.length - 1

        return { path, label, isLast }
    })

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
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
                    {breadcrumbItems.map((item, index) => (
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
        </header>
    )
}
