"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { PaginationMeta } from "@/types/pagination";

interface PaginationProps {
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({ pagination, onPageChange, className = "" }: PaginationProps) {
    const { page, limit, total, totalPages } = pagination;

    // Calculate display range
    const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    const canGoPrevious = page > 1;
    const canGoNext = page < totalPages;

    // Don't render if no data or only one page
    if (total === 0) {
        return null;
    }

    return (
        <div className={`flex items-center justify-between px-2 py-4 ${className}`}>
            <div className="text-sm text-muted-foreground">
                Menampilkan {startItem}-{endItem} dari {total} item
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(1)}
                    disabled={!canGoPrevious}
                    aria-label="First page"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(page - 1)}
                    disabled={!canGoPrevious}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">
                    Halaman {page} dari {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(page + 1)}
                    disabled={!canGoNext}
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(totalPages)}
                    disabled={!canGoNext}
                    aria-label="Last page"
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
