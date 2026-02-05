"use client";

import { useState, useEffect, useCallback } from "react";

interface UseFetchOptions {
    immediate?: boolean;
}

interface UseFetchResult<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useFetch<T>(
    url: string,
    options: UseFetchOptions = { immediate: true }
): UseFetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(options.immediate ?? true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Gagal mengambil data");
            }
            const result = await response.json();
            setData(result.data ?? result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setIsLoading(false);
        }
    }, [url]);

    useEffect(() => {
        if (options.immediate) {
            fetchData();
        }
    }, [fetchData, options.immediate]);

    return { data, isLoading, error, refetch: fetchData };
}

interface UseMutationOptions {
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

interface UseMutationResult<TData, TVariables> {
    mutate: (variables: TVariables) => Promise<TData | null>;
    isLoading: boolean;
    error: string | null;
}

export function useMutation<TData, TVariables>(
    url: string,
    method: "POST" | "PUT" | "DELETE" = "POST",
    options: UseMutationOptions = {}
): UseMutationResult<TData, TVariables> {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = async (variables: TVariables): Promise<TData | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(variables),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Operasi gagal");
            }

            const result = await response.json();
            options.onSuccess?.();
            return result.data ?? result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan";
            setError(errorMessage);
            options.onError?.(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { mutate, isLoading, error };
}

// Dashboard statistics types
export interface DashboardStats {
    expiredReagents: number;
    lowStockItems: number;
    outOfStockItems: number;
    upcomingCalibrations: number;
}

export interface ExpiringReagent {
    id: string;
    name: string;
    daysLeft: number;
    location: string;
}

export interface UpcomingCalibration {
    id: string;
    name: string;
    daysLeft: number;
    status: "scheduled" | "overdue";
}

// Reagent types for API
export interface ReagentCatalogItem {
    id: string;
    reagentName: string;
    casNumber: string | null;
    supplier: string | null;
    storageLocation: string;
    form: string;
    minimumStockLevel: number;
    stock?: number;
    status?: string;
    nearestExpDate?: string;
}

// Instrument types for API
export interface InstrumentItem {
    id: string;
    name: string;
    brand: string | null;
    model: string | null;
    calibrationVendor: string | null;
    calibrationInterval: number;
    lastCalibrationDate: string | null;
    nextCalibrationDate: string | null;
    status: string;
    scheduleStatus: string;
    assetType: string;
    location: string;
}

// Paginated fetch hook
import { PaginationMeta, PaginatedResponse, DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/types/pagination";

interface UseFetchPaginatedOptions {
    immediate?: boolean;
    debounceMs?: number;
}

interface UseFetchPaginatedResult<T> {
    data: T[];
    pagination: PaginationMeta;
    isLoading: boolean;
    isFetching: boolean; // NEW: For subtle loading indicator during refetch
    error: string | null;
    refetch: () => Promise<void>;
    page: number;
    setPage: (page: number) => void;
    search: string;
    setSearch: (search: string) => void;
}

export function useFetchPaginated<T>(
    baseUrl: string,
    filters: Record<string, string | undefined> = {},
    options: UseFetchPaginatedOptions = { immediate: true, debounceMs: 500 }
): UseFetchPaginatedResult<T> {
    const [data, setData] = useState<T[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>({
        page: DEFAULT_PAGE,
        limit: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 0,
    });
    // Separate loading states for better UX
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPageState] = useState(DEFAULT_PAGE);
    const [search, setSearchState] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search with 500ms delay (best practice for search UX)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, options.debounceMs ?? 500);
        return () => clearTimeout(timer);
    }, [search, options.debounceMs]);

    // Reset page to 1 when search changes
    useEffect(() => {
        setPageState(DEFAULT_PAGE);
    }, [debouncedSearch]);

    // Reset page to 1 when filters change
    const filtersKey = JSON.stringify(filters);
    useEffect(() => {
        setPageState(DEFAULT_PAGE);
    }, [filtersKey]);

    // Build URL with query params
    const buildUrl = useCallback(() => {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", DEFAULT_PAGE_SIZE.toString());
        if (debouncedSearch) {
            params.set("search", debouncedSearch);
        }
        // Add filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== "all") {
                params.set(key, value);
            }
        });
        return `${baseUrl}?${params.toString()}`;
    }, [baseUrl, page, debouncedSearch, filtersKey]);

    const fetchData = useCallback(async () => {
        // Don't clear data during fetch (SWR pattern - Stale While Revalidate)
        // This prevents blank screen during search
        setIsFetching(true);
        setError(null);
        try {
            const url = buildUrl();
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Gagal mengambil data");
            }
            const result: PaginatedResponse<T> = await response.json();
            setData(result.data);
            setPagination(result.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
            // Only clear data on initial load error, keep previous data on refetch error
            if (isInitialLoad) {
                setData([]);
                setPagination({
                    page: DEFAULT_PAGE,
                    limit: DEFAULT_PAGE_SIZE,
                    total: 0,
                    totalPages: 0,
                });
            }
        } finally {
            setIsFetching(false);
            setIsInitialLoad(false);
        }
    }, [buildUrl, isInitialLoad]);

    useEffect(() => {
        if (options.immediate) {
            fetchData();
        }
    }, [fetchData, options.immediate]);

    const setPage = useCallback((newPage: number) => {
        setPageState(newPage);
    }, []);

    const setSearch = useCallback((newSearch: string) => {
        setSearchState(newSearch);
    }, []);

    return {
        data,
        pagination,
        isLoading: isInitialLoad && isFetching, // Only true on first load
        isFetching, // True during any fetch (for subtle indicator)
        error,
        refetch: fetchData,
        page,
        setPage,
        search,
        setSearch,
    };
}
