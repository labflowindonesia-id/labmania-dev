"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Calendar,
    Users,
    FileText,
    ChevronLeft,
    ChevronRight,
    Eye,
    DownloadCloud,
    RefreshCw,
    Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// Types
interface CostStats {
    thisMonth: number;
    lastMonth: number;
    ytd: number;
    percentChange: number;
}

interface CostTrend {
    month: string;
    year: number;
    totalCost: number;
    executionCount: number;
}

interface CostLogItem {
    id: string;
    itemName: string;
    itemType: string;
    quantity: string;
    unit: string;
    unitCost: string;
    totalCost: string;
}

interface CostLog {
    id: string;
    trainingSetId: string | null;
    trainingName: string;
    executedAt: string;
    executedByName: string | null;
    participants: number;
    setsUsed: number;
    totalCost: string;
    notes: string | null;
    items: CostLogItem[];
}

interface UsageLog {
    id: string;
    date: string;
    usageItem: string;
    itemType: string;
    quantityUsed: string;
    unit: string | null;
    unitCost: string | null;
    totalCost: string | null;
    notes: string | null;
    userName?: string;
}

interface CostReportData {
    stats?: CostStats;
    trends?: CostTrend[];
    logs?: {
        data: CostLog[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
    usageLogs?: {
        data: UsageLog[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

export default function TrainingCostReportsPage() {
    const [data, setData] = useState<CostReportData | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Initial page load
    const [logsLoading, setLogsLoading] = useState(false); // Training logs pagination
    const [usageLogsLoading, setUsageLogsLoading] = useState(false); // Usage logs pagination
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [usageLogsPage, setUsageLogsPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<CostLog | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    // Date range filter state
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Track which pagination triggered the fetch
    const fetchTypeRef = useRef<'initial' | 'logs' | 'usageLogs' | 'filter'>('initial');

    // Fetch data with OPTIMIZED selective fetching
    // Only fetches the data that actually needs to change
    const fetchData = useCallback(async (fetchType: 'initial' | 'logs' | 'usageLogs' | 'filter' = 'initial') => {
        // Set appropriate loading state
        if (fetchType === 'initial' || fetchType === 'filter') {
            setIsLoading(true);
        } else if (fetchType === 'logs') {
            setLogsLoading(true);
        } else if (fetchType === 'usageLogs') {
            setUsageLogsLoading(true);
        }

        setError(null);
        try {
            // OPTIMIZATION: Selective fetching based on what changed
            // - 'initial' / 'filter': Fetch everything
            // - 'logs': Only fetch training logs
            // - 'usageLogs': Only fetch usage logs
            let viewParam: string;
            if (fetchType === 'logs') {
                viewParam = 'logs'; // Only fetch training logs
            } else if (fetchType === 'usageLogs') {
                viewParam = 'usageLogs'; // Only fetch usage logs
            } else {
                viewParam = 'all'; // Fetch everything for initial/filter
            }

            const params = new URLSearchParams({
                view: viewParam,
                page: String(page),
                limit: '8',
                usageLogsPage: String(usageLogsPage),
                usageLogsLimit: '8',
            });
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`/api/reports/training-costs?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Gagal mengambil data");
            }
            const result = await response.json();

            // OPTIMIZATION: Merge result with existing data instead of replacing all
            if (fetchType === 'logs' && data) {
                // Only update training logs, keep everything else
                setData(prev => prev ? { ...prev, logs: result.logs } : result);
            } else if (fetchType === 'usageLogs' && data) {
                // Only update usage logs, keep everything else
                setData(prev => prev ? { ...prev, usageLogs: result.usageLogs } : result);
            } else {
                // Full update for initial/filter
                setData(result);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setIsLoading(false);
            setLogsLoading(false);
            setUsageLogsLoading(false);
        }
    }, [page, usageLogsPage, startDate, endDate, data]);

    // Initial load
    useEffect(() => {
        fetchData('initial');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle page changes with appropriate loading states
    useEffect(() => {
        if (fetchTypeRef.current !== 'initial') {
            fetchData(fetchTypeRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, usageLogsPage]);

    // Handle filter changes
    useEffect(() => {
        if (data) { // Only after initial load
            fetchData('filter');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    // Pagination handlers with fetch type tracking
    const handleTrainingLogsPageChange = (newPage: number) => {
        fetchTypeRef.current = 'logs';
        setPage(newPage);
    };

    const handleUsageLogsPageChange = (newPage: number) => {
        fetchTypeRef.current = 'usageLogs';
        setUsageLogsPage(newPage);
    };

    // Format currency
    const formatCurrency = (amount: number | string): string => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    };

    // Format currency for chart
    const formatCurrencyShort = (amount: number): string => {
        if (amount >= 1000000000) {
            return `${(amount / 1000000000).toFixed(1)}M`;
        }
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}jt`;
        }
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(0)}rb`;
        }
        return `Rp${amount}`;
    };

    // View detail dialog
    const handleViewDetail = (log: CostLog) => {
        setSelectedLog(log);
        setDetailDialogOpen(true);
    };

    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Memuat data laporan...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <p className="text-destructive">{error}</p>
                <Button onClick={() => fetchData('initial')}>Coba Lagi</Button>
            </div>
        );
    }

    const stats = data?.stats;
    const trends = data?.trends || [];
    const logs = data?.logs?.data || [];
    const pagination = data?.logs?.pagination;
    const usageLogs = data?.usageLogs?.data || [];
    const usageLogsPagination = data?.usageLogs?.pagination;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Laporan Pengeluaran</h1>
                    <p className="text-muted-foreground">
                        Monitoring dan analisis biaya penggunaan material
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        placeholder="Dari"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-40"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                        type="date"
                        placeholder="Sampai"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-40"
                    />
                    <Button variant="outline" onClick={() => fetchData('filter')} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Bulan Ini */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Biaya Bulan Ini
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {formatCurrency(stats?.thisMonth || 0)}
                        </div>
                        <div className="flex items-center mt-1">
                            {(stats?.percentChange || 0) >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                            )}
                            <span className={`text-sm ${(stats?.percentChange || 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {Math.abs(stats?.percentChange || 0).toFixed(1)}%
                            </span>
                            <span className="text-sm text-muted-foreground ml-1">dari bulan lalu</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Bulan Lalu */}
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Biaya Bulan Lalu
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats?.lastMonth || 0)}
                        </div>
                    </CardContent>
                </Card>

                {/* YTD */}
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            Total Tahun Ini (YTD)
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                            {formatCurrency(stats?.ytd || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Trend Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Tren Biaya Bulanan</CardTitle>
                    <CardDescription>Visualisasi pengeluaran 6 bulan terakhir</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={trends}>
                            <defs>
                                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12 }}
                                axisLine={false}
                            />
                            <YAxis
                                tickFormatter={(value) => formatCurrencyShort(value)}
                                tick={{ fontSize: 12 }}
                                axisLine={false}
                            />
                            <Tooltip
                                formatter={(value) => [formatCurrency(value as number ?? 0), 'Biaya']}
                                labelFormatter={(label) => `Bulan: ${label}`}
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="totalCost"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#colorCost)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Cost Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Pengeluaran</CardTitle>
                    <CardDescription>Log detail biaya penggunaan material</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Training</TableHead>
                                <TableHead>Peserta</TableHead>
                                <TableHead>Sets</TableHead>
                                <TableHead className="text-right">Total Biaya</TableHead>
                                <TableHead className="text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Belum ada data pengeluaran
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            {format(new Date(log.executedAt), 'dd MMM yyyy HH:mm', { locale: localeID })}
                                        </TableCell>
                                        <TableCell className="font-medium">{log.trainingName}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                                                {log.participants}
                                            </div>
                                        </TableCell>
                                        <TableCell>{log.setsUsed}x</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(log.totalCost)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewDetail(log)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Detail
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} data
                            </p>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTrainingLogsPageChange(page - 1)}
                                    disabled={page <= 1 || logsLoading}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm flex items-center gap-2">
                                    {logsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Hal {pagination.page} / {pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTrainingLogsPageChange(page + 1)}
                                    disabled={page >= pagination.totalPages || logsLoading}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Usage Logs Table */}
            {usageLogs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Log Penggunaan Manual</CardTitle>
                        <CardDescription>Riwayat penggunaan langsung (non-training) dengan biaya</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Unit Cost</TableHead>
                                    <TableHead className="text-right">Total Biaya</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {usageLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            {format(new Date(log.date), 'dd MMM yyyy', { locale: localeID })}
                                        </TableCell>
                                        <TableCell className="font-medium">{log.usageItem}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{log.itemType}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(log.quantityUsed).toFixed(2)} {log.unit || ''}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {log.unitCost ? formatCurrency(log.unitCost) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {log.totalCost ? formatCurrency(log.totalCost) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Usage Logs Pagination Footer */}
                        {usageLogsPagination && usageLogsPagination.totalPages > 1 && (
                            <div className="flex items-center justify-between border-t pt-4 mt-4">
                                <span className="text-sm text-muted-foreground">
                                    Menampilkan {Math.min((usageLogsPage - 1) * 8 + 1, usageLogsPagination.total)}-
                                    {Math.min(usageLogsPage * 8, usageLogsPagination.total)} dari {usageLogsPagination.total} log
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUsageLogsPageChange(usageLogsPage - 1)}
                                        disabled={usageLogsPage <= 1 || usageLogsLoading}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm flex items-center gap-2">
                                        {usageLogsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Hal {usageLogsPagination.page} / {usageLogsPagination.totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUsageLogsPageChange(usageLogsPage + 1)}
                                        disabled={usageLogsPage >= usageLogsPagination.totalPages || usageLogsLoading}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Detail Dialog */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detail Pengeluaran</DialogTitle>
                        <DialogDescription>
                            {selectedLog?.trainingName} - {selectedLog && format(new Date(selectedLog.executedAt), 'dd MMMM yyyy HH:mm', { locale: localeID })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground">Peserta</p>
                                    <p className="text-lg font-bold">{selectedLog.participants}</p>
                                </div>
                                <div className="text-center p-3 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground">Sets</p>
                                    <p className="text-lg font-bold">{selectedLog.setsUsed}x</p>
                                </div>
                                <div className="text-center p-3 bg-primary/10 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Biaya</p>
                                    <p className="text-lg font-bold text-primary">{formatCurrency(selectedLog.totalCost)}</p>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="overflow-x-auto">
                                <h4 className="font-medium mb-2">Rincian Item</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Tipe</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Unit Cost</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedLog.items?.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.itemName}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{item.itemType}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {Number(item.quantity).toFixed(2)} {item.unit}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(item.unitCost)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(item.totalCost)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {selectedLog.notes && (
                                <div>
                                    <h4 className="font-medium mb-1">Catatan</h4>
                                    <p className="text-sm text-muted-foreground">{selectedLog.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
