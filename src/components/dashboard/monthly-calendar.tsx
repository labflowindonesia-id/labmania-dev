"use client"

import { useState, useMemo } from "react"
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { id } from "date-fns/locale"
import { DayPicker, type DayMouseEventHandler } from "react-day-picker"
import { ChevronLeft, ChevronRight, Wrench, AlertTriangle, Calendar as CalendarIcon, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export interface ScheduleEvent {
    id: string
    title: string
    date: Date
    type: "calibration" | "maintenance" | "expired" | "order"
    status?: string
    description?: string
    instrumentName?: string
    location?: string
}

interface MonthlyCalendarProps {
    events: ScheduleEvent[]
    onEventClick?: (event: ScheduleEvent) => void
}

const eventTypeConfig = {
    calibration: {
        color: "bg-blue-500",
        badgeVariant: "default" as const,
        label: "Kalibrasi",
        description: "Jadwal kalibrasi instrumen",
        icon: Wrench,
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        textColor: "text-blue-800 dark:text-blue-200"
    },
    maintenance: {
        color: "bg-purple-500",
        badgeVariant: "secondary" as const,
        label: "Maintenance",
        description: "Jadwal pemeliharaan",
        icon: Wrench,
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
        textColor: "text-purple-800 dark:text-purple-200"
    },
    expired: {
        color: "bg-red-500",
        badgeVariant: "destructive" as const,
        label: "Expired",
        description: "Reagen mendekati expired",
        icon: AlertTriangle,
        bgColor: "bg-red-100 dark:bg-red-900/30",
        textColor: "text-red-800 dark:text-red-200"
    },
    order: {
        color: "bg-green-500",
        badgeVariant: "outline" as const,
        label: "Order",
        description: "Pesanan tiba",
        icon: Package,
        bgColor: "bg-green-100 dark:bg-green-900/30",
        textColor: "text-green-800 dark:text-green-200"
    },
}

const months = [
    { value: "0", label: "Januari" },
    { value: "1", label: "Februari" },
    { value: "2", label: "Maret" },
    { value: "3", label: "April" },
    { value: "4", label: "Mei" },
    { value: "5", label: "Juni" },
    { value: "6", label: "Juli" },
    { value: "7", label: "Agustus" },
    { value: "8", label: "September" },
    { value: "9", label: "Oktober" },
    { value: "10", label: "November" },
    { value: "11", label: "Desember" },
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 10 }, (_, i) => ({
    value: String(currentYear - 5 + i),
    label: String(currentYear - 5 + i),
}))

export function MonthlyCalendar({ events, onEventClick }: MonthlyCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedEvents, setSelectedEvents] = useState<ScheduleEvent[]>([])

    // Get all dates that have events
    const eventDates = useMemo(() => {
        return events.map(event => event.date)
    }, [events])

    // Get events for a specific day
    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(event.date, day))
    }

    // Handle day click
    const handleDayClick: DayMouseEventHandler = (day, modifiers) => {
        const dayEvents = getEventsForDay(day)
        if (dayEvents.length > 0) {
            setSelectedDate(day)
            setSelectedEvents(dayEvents)
            setIsDialogOpen(true)
            onEventClick?.(dayEvents[0])
        } else {
            setSelectedDate(day)
        }
    }

    // Navigation handlers
    const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const goToToday = () => setCurrentMonth(new Date())

    const handleMonthChange = (month: string) => {
        const newDate = new Date(currentMonth)
        newDate.setMonth(parseInt(month))
        setCurrentMonth(newDate)
    }

    const handleYearChange = (year: string) => {
        const newDate = new Date(currentMonth)
        newDate.setFullYear(parseInt(year))
        setCurrentMonth(newDate)
    }

    return (
        <div className="space-y-4">
            {/* Custom Header with Dropdowns */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Hari Ini
                    </Button>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={String(currentMonth.getMonth())}
                        onValueChange={handleMonthChange}
                    >
                        <SelectTrigger className="w-[130px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((month) => (
                                <SelectItem key={month.value} value={month.value}>
                                    {month.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={String(currentMonth.getFullYear())}
                        onValueChange={handleYearChange}
                    >
                        <SelectTrigger className="w-[100px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((year) => (
                                <SelectItem key={year.value} value={year.value}>
                                    {year.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Calendar */}
            <div className="flex justify-center">
                <DayPicker
                    locale={id}
                    mode="single"
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    selected={selectedDate}
                    onDayClick={handleDayClick}
                    showOutsideDays={true}
                    hideNavigation={true}
                    modifiers={{
                        hasEvent: eventDates
                    }}
                    modifiersClassNames={{
                        hasEvent: "relative"
                    }}
                    className="rounded-md border shadow-sm p-3"
                    classNames={{
                        months: "flex flex-col sm:flex-row gap-2",
                        month: "flex flex-col gap-4",
                        month_caption: "flex justify-center pt-1 relative items-center w-full",
                        caption_label: "text-sm font-medium",
                        nav: "hidden",
                        month_grid: "w-full border-collapse space-y-1",
                        weekdays: "flex",
                        weekday: "text-muted-foreground rounded-md w-10 font-normal text-[0.8rem] text-center",
                        week: "flex w-full mt-2",
                        day: "h-10 w-10 text-center text-sm p-0 relative",
                        day_button: cn(
                            "h-10 w-10 p-0 font-normal inline-flex items-center justify-center rounded-md text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            "aria-selected:opacity-100",
                            "cursor-pointer"
                        ),
                        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        today: "bg-accent text-accent-foreground font-bold",
                        outside: "text-muted-foreground opacity-50",
                        disabled: "text-muted-foreground opacity-50",
                        hidden: "invisible",
                    }}
                    components={{
                        DayButton: ({ day, modifiers, ...props }) => {
                            const dayEvents = getEventsForDay(day.date)
                            const hasEvents = dayEvents.length > 0

                            // Get unique event types for this day
                            const eventTypes = [...new Set(dayEvents.map(e => e.type))]

                            return (
                                <button
                                    {...props}
                                    className={cn(
                                        props.className,
                                        hasEvents && "cursor-pointer"
                                    )}
                                >
                                    <span className="relative">
                                        {day.date.getDate()}
                                        {hasEvents && (
                                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                                {eventTypes.slice(0, 3).map((type, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            eventTypeConfig[type].color
                                                        )}
                                                    />
                                                ))}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            )
                        }
                    }}
                />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-xs">
                {Object.entries(eventTypeConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full", config.color)} />
                        <span className="text-muted-foreground">{config.label}</span>
                    </div>
                ))}
            </div>

            {/* Event Detail Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" />
                            {selectedDate && format(selectedDate, "d MMMM yyyy", { locale: id })}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedEvents.length} event pada tanggal ini
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {selectedEvents.map((event) => {
                            const config = eventTypeConfig[event.type]
                            const Icon = config.icon
                            return (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "p-4 rounded-lg border",
                                        config.bgColor
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "p-2 rounded-full",
                                            config.color,
                                            "bg-opacity-20"
                                        )}>
                                            <Icon className={cn("h-4 w-4", config.textColor)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className={cn("font-semibold", config.textColor)}>
                                                    {event.title}
                                                </h4>
                                                <Badge variant={config.badgeVariant} className="shrink-0">
                                                    {config.label}
                                                </Badge>
                                            </div>
                                            {event.instrumentName && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    <span className="font-medium">Instrumen:</span> {event.instrumentName}
                                                </p>
                                            )}
                                            {event.location && (
                                                <p className="text-sm text-muted-foreground">
                                                    <span className="font-medium">Lokasi:</span> {event.location}
                                                </p>
                                            )}
                                            {event.description && (
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {event.description}
                                                </p>
                                            )}
                                            {event.status && (
                                                <p className="text-sm mt-2">
                                                    <span className="font-medium">Status:</span>{" "}
                                                    <Badge variant="outline" className="ml-1">
                                                        {event.status}
                                                    </Badge>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
