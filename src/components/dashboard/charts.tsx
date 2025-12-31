"use client"

import { useMemo } from "react"
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Label
} from "recharts"

// --- Interfaces ---

interface InstrumentStatusChartProps {
    data: {
        name: string
        value: number
        color: string
    }[]
}

interface InventoryStockChartProps {
    data: {
        category: string
        tersedia: number
        menipis: number
        habis: number
    }[]
}

interface MonthlyUsageChartProps {
    data: {
        month: string
        reagen: number
        consumable: number
    }[]
}

// --- Custom Tooltips ---

const PieTooltipContent = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: payload[0].payload.color }}
                    />
                    <span className="font-medium">{payload[0].name}</span>
                    <span className="text-muted-foreground ml-2">{payload[0].value}</span>
                </div>
            </div>
        )
    }
    return null
}

const BarTooltipContent = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-lg min-w-[150px]">
                <p className="font-semibold text-foreground mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2.5 h-2.5 rounded-sm"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-medium">{entry.value}</span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

// --- Main Components ---

export function InstrumentStatusChart({ data }: InstrumentStatusChartProps) {
    const total = useMemo(() => {
        return data.reduce((acc, curr) => acc + curr.value, 0)
    }, [data])

    return (
        <ResponsiveContainer width="100%" height={280}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                    animationDuration={800}
                    animationBegin={0}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="cursor-pointer transition-opacity hover:opacity-80"
                        />
                    ))}
                    <Label
                        position="center"
                        content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                return (
                                    <text
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                    >
                                        {/* Angka Total */}
                                        <tspan
                                            x={viewBox.cx}
                                            dy="-0.5em" // Menggeser sedikit ke atas dari titik tengah
                                            className="fill-foreground text-3xl font-bold"
                                        >
                                            {total.toLocaleString()}
                                        </tspan>
                                        {/* Label "Total Alat" */}
                                        <tspan
                                            x={viewBox.cx}
                                            dy="1.5em" // Menggeser ke bawah relatif terhadap baris sebelumnya
                                            className="fill-muted-foreground text-sm"
                                        >
                                            Total Alat
                                        </tspan>
                                    </text>
                                )
                            }
                            return null;
                        }}
                    />
                </Pie>
                <Tooltip content={<PieTooltipContent />} />
                <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={10}
                    wrapperStyle={{ paddingTop: 20 }}
                />
            </PieChart>
        </ResponsiveContainer>
    )
}

export function InventoryStockChart({ data }: InventoryStockChartProps) {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                    dataKey="category"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    content={<BarTooltipContent />}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                />
                <Legend
                    iconType="circle"
                    iconSize={10}
                    wrapperStyle={{ paddingTop: 10 }}
                />
                <Bar
                    dataKey="tersedia"
                    name="Tersedia"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    animationDuration={800}
                />
                <Bar
                    dataKey="menipis"
                    name="Menipis"
                    fill="#eab308"
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    animationDuration={800}
                />
                <Bar
                    dataKey="habis"
                    name="Habis"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    animationDuration={800}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

export function MonthlyUsageChart({ data }: MonthlyUsageChartProps) {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    content={<BarTooltipContent />}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                />
                <Legend
                    iconType="circle"
                    iconSize={10}
                    wrapperStyle={{ paddingTop: 10 }}
                />
                <Bar
                    dataKey="reagen"
                    name="Reagen"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    animationDuration={800}
                />
                <Bar
                    dataKey="consumable"
                    name="Consumable"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    animationDuration={800}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}