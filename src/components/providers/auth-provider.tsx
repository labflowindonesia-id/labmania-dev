"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check session on mount
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const response = await fetch("/api/auth/session");
            const data = await response.json();
            setUser(data.user || null);
        } catch (error) {
            console.error("Session check error:", error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = async (username: string, password: string, role: string) => {
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
            return { success: true };
        } catch (error) {
            console.error("Sign in error:", error);
            return { success: false, error: "Terjadi kesalahan saat login" };
        }
    };

    const signOut = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            setUser(null);
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
