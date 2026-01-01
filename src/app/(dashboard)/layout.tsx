"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/components/providers/auth-provider"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const { user, isLoading } = useAuth()

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login")
        }
    }, [user, isLoading, router])

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Don't render dashboard if not authenticated
    if (!user) {
        return null
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Header />
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}

