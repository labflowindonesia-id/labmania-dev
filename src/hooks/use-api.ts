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
