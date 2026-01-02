"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Database, Calendar, CheckCircle, XCircle, Loader2, HardDrive, Clock } from "lucide-react";
import { toast } from "sonner";

export default function BackupPage() {
    const [isDownloading, setIsDownloading] = useState(false);
    const [lastBackupResult, setLastBackupResult] = useState<{
        success: boolean;
        filename?: string;
        error?: string;
    } | null>(null);

    const handleDownloadBackup = async () => {
        setIsDownloading(true);
        setLastBackupResult(null);

        try {
            const response = await fetch("/api/admin/backup/download");

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to download backup");
            }

            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get("Content-Disposition");
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
            const filename = filenameMatch?.[1] || "backup.zip";

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setLastBackupResult({ success: true, filename });
            toast.success("Backup downloaded successfully!");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            setLastBackupResult({ success: false, error: message });
            toast.error(`Failed to download backup: ${message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Backup Data</h1>
                    <p className="text-muted-foreground">
                        Kelola backup database aplikasi LabFlow Assets
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Database Tables
                        </CardTitle>
                        <Database className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">14</div>
                        <p className="text-xs text-muted-foreground">Tables included in backup</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50 dark:border-green-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Automated Backup
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Monthly</div>
                        <p className="text-xs text-muted-foreground">1st of every month, 00:00 UTC</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50 dark:border-purple-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Storage Location
                        </CardTitle>
                        <HardDrive className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Supabase</div>
                        <p className="text-xs text-muted-foreground">backups/monthly/</p>
                    </CardContent>
                </Card>
            </div>

            {/* Manual Backup Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Manual Backup
                    </CardTitle>
                    <CardDescription>
                        Download backup database secara manual. File backup berformat ZIP yang berisi file CSV untuk setiap tabel.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Download Backup Sekarang</p>
                            <p className="text-xs text-muted-foreground">
                                File backup akan berisi data dari semua tabel penting
                            </p>
                        </div>
                        <Button
                            onClick={handleDownloadBackup}
                            disabled={isDownloading}
                            className="gap-2"
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Download Backup
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Last Backup Result */}
                    {lastBackupResult && (
                        <div className={`flex items-center gap-2 rounded-lg p-3 ${lastBackupResult.success
                                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                            }`}>
                            {lastBackupResult.success ? (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-sm">
                                        Backup berhasil diunduh: {lastBackupResult.filename}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-sm">
                                        Gagal: {lastBackupResult.error}
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tables Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Data yang Di-backup
                    </CardTitle>
                    <CardDescription>
                        Daftar tabel database yang termasuk dalam backup
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {[
                            "profiles",
                            "instruments",
                            "calibration_logs",
                            "maintenance_logs",
                            "reagent_catalog",
                            "standard_catalog",
                            "items_catalog",
                            "warehouse_chemicals",
                            "warehouse_items",
                            "orders",
                            "order_items",
                            "usage_logs",
                            "training_sets",
                            "training_set_items",
                        ].map((table) => (
                            <div
                                key={table}
                                className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
                            >
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                {table}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Cron Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Automated Backup Schedule
                    </CardTitle>
                    <CardDescription>
                        Informasi jadwal backup otomatis
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted/50 p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Schedule</p>
                                <p className="text-sm font-mono">0 0 1 * * (Cron Expression)</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Frequency</p>
                                <p className="text-sm">Setiap tanggal 1 setiap bulan</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Time</p>
                                <p className="text-sm">00:00 UTC (07:00 WIB)</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Destination</p>
                                <p className="text-sm">Supabase Storage (backups bucket)</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
