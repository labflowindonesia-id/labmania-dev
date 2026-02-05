import { NextResponse } from 'next/server';

/**
 * Cache control headers for different response types
 * 
 * private: cached only in browser, not CDN
 * no-cache: browser must revalidate with server before using cached version
 * max-age: number of seconds the response is considered fresh
 * stale-while-revalidate: serve stale content while fetching new content in background
 */

export type CacheStrategy = 'no-store' | 'short' | 'medium' | 'long' | 'static';

const CACHE_HEADERS: Record<CacheStrategy, string> = {
    // For mutation responses or sensitive data
    'no-store': 'no-store, no-cache, must-revalidate',

    // For frequently changing data (10 seconds, stale for 30 more)
    'short': 'private, max-age=10, stale-while-revalidate=30',

    // For moderately static data (1 minute, stale for 5 more)
    'medium': 'private, max-age=60, stale-while-revalidate=300',

    // For rarely changing data (5 minutes, stale for 10 more)
    'long': 'private, max-age=300, stale-while-revalidate=600',

    // For static assets (1 hour)
    'static': 'public, max-age=3600, immutable',
};

interface ApiResponseOptions {
    status?: number;
    cache?: CacheStrategy;
    revalidate?: number; // seconds
}

/**
 * Create a JSON response with appropriate cache headers
 */
export function apiResponse<T>(
    data: T,
    options: ApiResponseOptions = {}
): NextResponse<T> {
    const { status = 200, cache = 'short' } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Cache-Control': CACHE_HEADERS[cache],
    };

    return new NextResponse(JSON.stringify(data), {
        status,
        headers,
    });
}

/**
 * Create an error response (no caching)
 */
export function apiError(
    message: string,
    status: number = 500
): NextResponse<{ error: string }> {
    return new NextResponse(JSON.stringify({ error: message }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': CACHE_HEADERS['no-store'],
        },
    });
}

/**
 * Create a success response for mutations (no caching)
 */
export function apiSuccess<T>(
    data: T,
    status: number = 200
): NextResponse<{ data: T }> {
    return new NextResponse(JSON.stringify({ data }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': CACHE_HEADERS['no-store'],
        },
    });
}
