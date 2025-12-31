"use client"

import {
    LayoutDashboard,
    FlaskConical,
    TestTubes,
    Package,
    Warehouse,
    ClipboardList,
    ShoppingCart,
    GraduationCap,
    Microscope,
    FileText,
    Wrench,
    Bot,
    Moon,
    Sun,
    ChevronDown,
    LogOut,
    User,
    Settings,
    Users,
} from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/providers/auth-provider"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Menu items untuk Inventory
const inventoryItems = [
    {
        title: "Katalog Reagen",
        url: "/inventory/reagents",
        icon: FlaskConical,
    },
    {
        title: "Katalog Standard",
        url: "/inventory/standards",
        icon: TestTubes,
    },
    {
        title: "Katalog Barang",
        url: "/inventory/items",
        icon: Package,
    },
    {
        title: "Gudang Kimia",
        url: "/inventory/warehouse-chemicals",
        icon: Warehouse,
    },
    {
        title: "Gudang Barang",
        url: "/inventory/warehouse-items",
        icon: Warehouse,
    },
    {
        title: "Log Penggunaan",
        url: "/inventory/usage-logs",
        icon: ClipboardList,
    },
    {
        title: "Pesanan",
        url: "/inventory/orders",
        icon: ShoppingCart,
    },
    {
        title: "Training Usage",
        url: "/inventory/training",
        icon: GraduationCap,
    },
]

// Menu items untuk Instrumen
const instrumentItems = [
    {
        title: "Database Instrumen",
        url: "/instruments/database",
        icon: Microscope,
    },
    {
        title: "Log Kalibrasi",
        url: "/instruments/calibration-logs",
        icon: FileText,
    },
    {
        title: "Maintenance",
        url: "/instruments/maintenance",
        icon: Wrench,
    },
]

export function AppSidebar() {
    const { theme, setTheme } = useTheme()
    const pathname = usePathname()
    const router = useRouter()
    const { user, signOut } = useAuth()

    const isActive = (url: string) => {
        if (url === "/") return pathname === "/"
        return pathname.startsWith(url)
    }

    const handleLogout = async () => {
        await signOut()
        router.push("/login")
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "admin":
                return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            case "manager":
                return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            default:
                return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        }
    }

    return (
        <Sidebar className="border-r border-sidebar-border">
            <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <FlaskConical className="h-4 w-4" />
                    </div>
                    <span className="text-lg font-semibold">LIMS Custom</span>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                {/* Dashboard */}
                <SidebarGroup>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={isActive("/")}>
                                <Link href="/">
                                    <LayoutDashboard />
                                    <span>Dashboard</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                {/* Inventory Section */}
                <Collapsible defaultOpen className="group/collapsible">
                    <SidebarGroup>
                        <CollapsibleTrigger asChild>
                            <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent">
                                <span>INVENTORY</span>
                                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </SidebarGroupLabel>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {inventoryItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild isActive={isActive(item.url)}>
                                                <Link href={item.url}>
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>

                {/* Instrumen Section */}
                <Collapsible defaultOpen className="group/collapsible">
                    <SidebarGroup>
                        <CollapsibleTrigger asChild>
                            <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent">
                                <span>INSTRUMEN</span>
                                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </SidebarGroupLabel>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {instrumentItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild isActive={isActive(item.url)}>
                                                <Link href={item.url}>
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>

                {/* AI Section */}
                <SidebarGroup>
                    <SidebarGroupLabel>AI</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isActive("/chat")}>
                                    <Link href="/chat">
                                        <Bot />
                                        <span>Chat AI</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Admin Section - Only visible for admin role */}
                {user?.role === 'admin' && (
                    <SidebarGroup>
                        <SidebarGroupLabel>ADMIN</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isActive("/admin/users")}>
                                        <Link href="/admin/users">
                                            <Users />
                                            <span>Manajemen User</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
                {/* User Info */}
                {user && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.fullName}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                                {user.role}
                            </span>
                        </div>
                    </div>
                )}

                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full justify-start"
                >
                    {theme === "dark" ? (
                        <>
                            <Sun className="mr-2 h-4 w-4" />
                            Mode Terang
                        </>
                    ) : (
                        <>
                            <Moon className="mr-2 h-4 w-4" />
                            Mode Gelap
                        </>
                    )}
                </Button>

                {/* Logout Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}

