/**
 * Rate Limiter Utility
 * Token bucket algorithm for API rate limiting
 */

interface RateLimitEntry {
    tokens: number;
    lastRefill: number;
}

interface RateLimitConfig {
    maxTokens: number;      // Maximum requests allowed
    refillRate: number;     // Tokens refilled per interval
    refillInterval: number; // Interval in milliseconds
}

// In-memory store for rate limiting (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
    chat: {
        maxTokens: 10,          // 10 requests max
        refillRate: 10,         // Refill all tokens
        refillInterval: 60000,  // Per minute
    },
    upload: {
        maxTokens: 20,          // 20 requests max
        refillRate: 20,         // Refill all tokens
        refillInterval: 60000,  // Per minute
    },
    default: {
        maxTokens: 100,         // 100 requests max
        refillRate: 100,        // Refill all tokens
        refillInterval: 60000,  // Per minute
    },
} as const;

export type RateLimitEndpoint = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Get client identifier from request (IP-based)
 */
export function getClientId(request: Request): string {
    // Try to get real IP from headers (for proxied requests)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback to a hash of user-agent + timestamp for same-session tracking
    return 'unknown-' + Math.random().toString(36).substring(2);
}

/**
 * Check if request is rate limited
 * Returns remaining tokens or -1 if limited
 */
export function checkRateLimit(
    clientId: string,
    endpoint: RateLimitEndpoint = 'default'
): { allowed: boolean; remaining: number; resetIn: number } {
    const config = RATE_LIMIT_CONFIGS[endpoint];
    const now = Date.now();
    const key = `${endpoint}:${clientId}`;

    let entry = rateLimitStore.get(key);

    if (!entry) {
        // First request from this client
        entry = {
            tokens: config.maxTokens - 1,
            lastRefill: now,
        };
        rateLimitStore.set(key, entry);
        return {
            allowed: true,
            remaining: entry.tokens,
            resetIn: config.refillInterval,
        };
    }

    // Calculate time since last refill
    const timeSinceRefill = now - entry.lastRefill;

    // Refill tokens if interval has passed
    if (timeSinceRefill >= config.refillInterval) {
        entry.tokens = config.maxTokens;
        entry.lastRefill = now;
    }

    // Check if tokens available
    if (entry.tokens <= 0) {
        const resetIn = config.refillInterval - timeSinceRefill;
        return {
            allowed: false,
            remaining: 0,
            resetIn: Math.max(0, resetIn),
        };
    }

    // Consume token
    entry.tokens--;
    rateLimitStore.set(key, entry);

    return {
        allowed: true,
        remaining: entry.tokens,
        resetIn: config.refillInterval - timeSinceRefill,
    };
}

/**
 * Create rate limit headers for response
 */
export function getRateLimitHeaders(
    endpoint: RateLimitEndpoint,
    remaining: number,
    resetIn: number
): Record<string, string> {
    const config = RATE_LIMIT_CONFIGS[endpoint];
    return {
        'X-RateLimit-Limit': config.maxTokens.toString(),
        'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
        'X-RateLimit-Reset': Math.ceil(resetIn / 1000).toString(),
    };
}

/**
 * Clean up old entries (call periodically to prevent memory leaks)
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, entry] of rateLimitStore.entries()) {
        if (now - entry.lastRefill > maxAge) {
            rateLimitStore.delete(key);
        }
    }
}
