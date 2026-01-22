"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface SearchableSelectOption {
    value: string
    label: string
    category?: string
    disabled?: boolean
}

interface SearchableSelectProps {
    options: SearchableSelectOption[]
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    disabled?: boolean
    isLoading?: boolean
    className?: string
    // Virtual scrolling config
    itemHeight?: number
    maxDisplayItems?: number
}

const ITEM_HEIGHT = 36
const MAX_DISPLAY_ITEMS = 8
const VIRTUAL_BUFFER = 5

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = "Pilih item...",
    searchPlaceholder = "Cari item...",
    emptyMessage = "Tidak ada item ditemukan",
    disabled = false,
    isLoading = false,
    className,
    itemHeight = ITEM_HEIGHT,
    maxDisplayItems = MAX_DISPLAY_ITEMS,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [scrollTop, setScrollTop] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Filter options based on search
    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options
        const searchLower = search.toLowerCase()
        return options.filter(option =>
            option.label.toLowerCase().includes(searchLower) ||
            (option.category?.toLowerCase().includes(searchLower) ?? false)
        )
    }, [options, search])

    // Virtual scrolling calculations
    const totalHeight = filteredOptions.length * itemHeight
    const visibleHeight = maxDisplayItems * itemHeight
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - VIRTUAL_BUFFER)
    const endIndex = Math.min(
        filteredOptions.length,
        Math.ceil((scrollTop + visibleHeight) / itemHeight) + VIRTUAL_BUFFER
    )
    const visibleItems = filteredOptions.slice(startIndex, endIndex)
    const offsetY = startIndex * itemHeight

    // Handle scroll
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop)
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open])

    // Reset search when closing
    useEffect(() => {
        if (!open) {
            setSearch("")
            setScrollTop(0)
        } else {
            // Focus search input when opening
            setTimeout(() => inputRef.current?.focus(), 10)
        }
    }, [open])

    // Get selected label
    const selectedLabel = options.find(opt => opt.value === value)?.label

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                disabled={disabled || isLoading}
                onClick={() => setOpen(!open)}
                className={cn(
                    "w-full justify-between font-normal",
                    !value && "text-muted-foreground"
                )}
            >
                {isLoading ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                    </span>
                ) : (
                    <span className="truncate">
                        {selectedLabel || placeholder}
                    </span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
                    {/* Search input */}
                    <div className="flex items-center border-b px-3 py-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                            ref={inputRef}
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                        />
                    </div>

                    {/* Virtual scrolling list */}
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="overflow-y-auto"
                        style={{ maxHeight: visibleHeight }}
                    >
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                {emptyMessage}
                            </div>
                        ) : (
                            <div style={{ height: totalHeight, position: "relative" }}>
                                <div style={{ transform: `translateY(${offsetY}px)` }}>
                                    {visibleItems.map((option) => (
                                        <div
                                            key={option.value}
                                            onClick={() => {
                                                if (!option.disabled) {
                                                    onValueChange(option.value)
                                                    setOpen(false)
                                                }
                                            }}
                                            className={cn(
                                                "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none transition-colors",
                                                "hover:bg-accent hover:text-accent-foreground",
                                                option.value === value && "bg-accent",
                                                option.disabled && "pointer-events-none opacity-50"
                                            )}
                                            style={{ height: itemHeight }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 shrink-0",
                                                    option.value === value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="truncate flex-1">{option.label}</span>
                                            {option.category && (
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    {option.category}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Item count footer */}
                    {filteredOptions.length > 0 && (
                        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                            {search ? (
                                <span>{filteredOptions.length} dari {options.length} item</span>
                            ) : (
                                <span>{options.length} item</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
