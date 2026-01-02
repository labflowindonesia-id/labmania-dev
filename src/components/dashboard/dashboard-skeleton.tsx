"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

function SkeletonPulse({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-muted rounded ${className || ''}`} />
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div>
                <SkeletonPulse className="h-9 w-48 mb-2" />
                <SkeletonPulse className="h-5 w-72" />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <SkeletonPulse className="h-4 w-24" />
                            <SkeletonPulse className="h-8 w-8 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <SkeletonPulse className="h-8 w-16 mb-1" />
                            <SkeletonPulse className="h-3 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Calendar Section */}
            <Card>
                <CardHeader>
                    <SkeletonPulse className="h-6 w-40" />
                    <SkeletonPulse className="h-4 w-64 mt-1" />
                </CardHeader>
                <CardContent>
                    <SkeletonPulse className="h-[200px] w-full rounded-lg" />
                </CardContent>
            </Card>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Chart 1 */}
                <Card>
                    <CardHeader>
                        <SkeletonPulse className="h-6 w-36" />
                        <SkeletonPulse className="h-4 w-48 mt-1" />
                    </CardHeader>
                    <CardContent>
                        <SkeletonPulse className="h-[250px] w-full rounded-lg" />
                    </CardContent>
                </Card>
                {/* Chart 2 */}
                <Card>
                    <CardHeader>
                        <SkeletonPulse className="h-6 w-40" />
                        <SkeletonPulse className="h-4 w-56 mt-1" />
                    </CardHeader>
                    <CardContent>
                        <SkeletonPulse className="h-[250px] w-full rounded-lg" />
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Usage Chart */}
            <Card>
                <CardHeader>
                    <SkeletonPulse className="h-6 w-48" />
                    <SkeletonPulse className="h-4 w-64 mt-1" />
                </CardHeader>
                <CardContent>
                    <SkeletonPulse className="h-[250px] w-full rounded-lg" />
                </CardContent>
            </Card>

            {/* Quick Access Cards */}
            <div className="grid gap-6 lg:grid-cols-2">
                {[1, 2].map((i) => (
                    <Card key={i}>
                        <CardHeader>
                            <SkeletonPulse className="h-6 w-44" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[1, 2, 3].map((j) => (
                                    <div key={j} className="flex items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-1">
                                            <SkeletonPulse className="h-4 w-32" />
                                            <SkeletonPulse className="h-3 w-20" />
                                        </div>
                                        <SkeletonPulse className="h-6 w-16 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
