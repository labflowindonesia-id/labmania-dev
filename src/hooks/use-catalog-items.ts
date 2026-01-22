"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface CatalogItem {
    id: string
    name: string
    category: string
}

interface CacheData {
    items: CatalogItem[]
    timestamp: number
}

// Cache storage
const catalogCache: Record<string, CacheData> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Hook for fetching catalog items with caching
 * Uses stale-while-revalidate pattern for fast loading
 */
export function useCatalogItems(
    endpoint: string,
    options: {
        transform?: (data: unknown) => CatalogItem[]
        enabled?: boolean
    } = {}
) {
    const { transform, enabled = true } = options
    const [items, setItems] = useState<CatalogItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const isMounted = useRef(true)

    const fetchItems = useCallback(async (force = false) => {
        if (!enabled) return

        const cacheKey = endpoint
        const cached = catalogCache[cacheKey]
        const now = Date.now()

        // Use cache if valid and not forcing refresh
        if (!force && cached && (now - cached.timestamp) < CACHE_TTL) {
            setItems(cached.items)
            return
        }

        // Show cached data immediately while fetching fresh data
        if (cached) {
            setItems(cached.items)
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`${endpoint}?limit=all`)
            if (!response.ok) throw new Error("Gagal memuat data")

            const data = await response.json()

            let fetchedItems: CatalogItem[]
            if (transform) {
                fetchedItems = transform(data)
            } else {
                // Default transform: expects { data: [...] } format
                fetchedItems = (data.data || []).map((item: { id: string; name: string; category?: string }) => ({
                    id: item.id,
                    name: item.name,
                    category: item.category || "",
                }))
            }

            // Update cache
            catalogCache[cacheKey] = {
                items: fetchedItems,
                timestamp: now,
            }

            if (isMounted.current) {
                setItems(fetchedItems)
            }
        } catch (err) {
            if (isMounted.current) {
                setError(err instanceof Error ? err.message : "Terjadi kesalahan")
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false)
            }
        }
    }, [endpoint, enabled, transform])

    useEffect(() => {
        isMounted.current = true
        fetchItems()
        return () => { isMounted.current = false }
    }, [fetchItems])

    const refetch = useCallback(() => fetchItems(true), [fetchItems])

    return { items, isLoading, error, refetch }
}

/**
 * Clear catalog cache - call this when catalog items are modified
 */
export function clearCatalogCache(endpoint?: string) {
    if (endpoint) {
        delete catalogCache[endpoint]
    } else {
        Object.keys(catalogCache).forEach(key => delete catalogCache[key])
    }
}
