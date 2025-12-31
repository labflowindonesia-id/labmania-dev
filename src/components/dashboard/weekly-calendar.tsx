"use client"

import { useState, useEffect } from "react"
import {
    format,
    startOfWeek,
    endOfWeek,
    addDays,
    addWeeks,
    subWeeks,
    isSameDay,
} from "date-fns"
import { id } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScheduleEvent {
    id: string
    title: string
    date: Date
    type: "calibration" | "maintenance" | "expired" | "order"
    status?: string
}

interface WeeklyCalendarProps {
    events: ScheduleEvent[]
    onEventClick?: (event: ScheduleEvent) => void
}

const eventTypeConfig = {
    calibration: {
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: Wrench
    },
    maintenance: {
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        icon: Wrench
    },
    expired: {
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        icon: AlertTriangle
    },
    order: {
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: CalendarIcon
    },
}

export function WeeklyCalendar({ events, onEventClick }: WeeklyCalendarProps) {
    const [mounted, setMounted] = useState(false)
    const [currentDate, setCurrentDate] = useState(new Date())

    useEffect(() => {
        setMounted(true)
    }, [])

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1))
    const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
    const goToToday = () => setCurrentDate(new Date())

    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(event.date, day))
    }

    const isToday = (day: Date) => isSameDay(day, new Date())

    if (!mounted) {
        return <div className="h-[200px] animate-pulse bg-muted rounded-lg" />
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Hari Ini
                    </Button>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <h3 className="text-lg font-semibold">
                    {format(weekStart, "d MMM", { locale: id })} - {format(weekEnd, "d MMM yyyy", { locale: id })}
                </h3>
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                    <div key={day.toISOString()} className="min-h-[120px]">
                        {/* Day Header */}
                        <div className={cn(
                            "text-center p-2 rounded-t-lg",
                            isToday(day) ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                            <div className="text-xs font-medium">
                                {format(day, "EEE", { locale: id })}
                            </div>
                            <div className="text-lg font-bold">
                                {format(day, "d")}
                            </div>
                        </div>

                        {/* Events */}
                        <div className="border border-t-0 rounded-b-lg p-1 min-h-[80px] space-y-1">
                            {getEventsForDay(day).map((event) => {
                                const config = eventTypeConfig[event.type]
                                const Icon = config.icon
                                return (
                                    <button
                                        key={event.id}
                                        onClick={() => onEventClick?.(event)}
                                        className={cn(
                                            "w-full text-left p-1 rounded text-xs truncate flex items-center gap-1",
                                            config.color,
                                            "hover:opacity-80 transition-opacity"
                                        )}
                                    >
                                        <Icon className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{event.title}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
