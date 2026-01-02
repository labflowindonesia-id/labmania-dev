"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";

export interface User {
    id: string;
    username: string;
    fullName: string;
    role: "admin" | "manager" | "analyst";
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    signIn: (username: string, password: string, role: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_CACHE_KEY = 'labmania_session_cache';
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedSession {
    user: User | null;
    timestamp: number;
}

function getCachedSession(): User | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
        if (cached) {
            const parsed: CachedSession = JSON.parse(cached);
            // Check if cache is still valid (within TTL)
            if (Date.now() - parsed.timestamp < SESSION_CACHE_TTL) {
                return parsed.user;
            }
        }
    } catch {
        // Ignore parse errors
    }
    return null;
}

function setCachedSession(user: User | null): void {
    if (typeof window === 'undefined') return;
    try {
        const cache: CachedSession = { user, timestamp: Date.now() };
        sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Ignore storage errors
    }
}

function clearCachedSession(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch {
        // Ignore storage errors
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Refs to prevent race conditions between login and session check
    const isSigningInRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const checkSession = useCallback(async (useCache = true) => {
        // Don't check session while signing in to prevent race conditions
        if (isSigningInRef.current) {
            console.log('[Auth] Skipping session check - signing in');
            return;
        }

        // Try to use cached session first for instant loading
        if (useCache) {
            const cached = getCachedSession();
            if (cached) {
                console.log('[Auth] Using cached session');
                setUser(cached);
                setIsLoading(false);
                // Don't do background revalidation immediately - it can cause conflicts
                // Background revalidation will happen on next navigation or focus
                return;
            }
        }

        // Abort any previous pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            console.log('[Auth] Fetching session from API...');
            const response = await fetch("/api/auth/session", {
                signal: abortControllerRef.current.signal,
            });
            const data = await response.json();
            const sessionUser = data.user || null;
            setUser(sessionUser);
            setCachedSession(sessionUser);
        } catch (error) {
            // Ignore abort errors
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('[Auth] Session check aborted');
                return;
            }
            console.error("Session check error:", error);
            setUser(null);
            clearCachedSession();
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Check session on mount
    useEffect(() => {
        checkSession(true);
    }, [checkSession]);

    const signIn = async (username: string, password: string, role: string) => {
        // Set flag to prevent concurrent session checks
        isSigningInRef.current = true;

        // Abort any pending session check
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, role }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error || "Login gagal" };
            }

            setUser(data.user);
            setCachedSession(data.user);
            return { success: true };
        } catch (error) {
            console.error("Sign in error:", error);
            return { success: false, error: "Terjadi kesalahan saat login" };
        } finally {
            isSigningInRef.current = false;
        }
    };

    const signOut = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            setUser(null);
            clearCachedSession();
        } catch (error) {
            console.error("Sign out error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
