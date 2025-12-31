import { createClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export interface LoginCredentials {
    username: string;
    password: string;
    role: 'admin' | 'manager' | 'analyst';
}

export interface AuthResult {
    success: boolean;
    error?: string;
    user?: {
        id: string;
        username: string;
        fullName: string;
        role: string;
    };
}

class AuthService {
    /**
     * Login with username, password, and role validation
     * Since Supabase Auth uses email/password, we:
     * 1. Look up user by username to get their email and stored role
     * 2. Validate that the selected role matches their actual role
     * 3. Authenticate with Supabase using email/password
     */
    async login(credentials: LoginCredentials): Promise<AuthResult> {
        const { username, password, role } = credentials;

        try {
            // Step 1: Find user profile by username
            const profile = await db.query.profiles.findFirst({
                where: eq(schema.profiles.username, username),
            });

            if (!profile) {
                return { success: false, error: 'Username tidak ditemukan' };
            }

            // Step 2: Validate role matches
            if (profile.role !== role) {
                return {
                    success: false,
                    error: `User "${username}" tidak memiliki akses sebagai ${role}. Role yang terdaftar: ${profile.role}`
                };
            }

            // Step 3: Authenticate with Supabase
            // Note: We store email in format: username@labmania.local for internal auth
            const email = `${username.toLowerCase()}@labmania.local`;

            const supabase = await createClient();
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('Supabase auth error:', error.message, error.code);
                return { success: false, error: `Password salah: ${error.message}` };
            }

            return {
                success: true,
                user: {
                    id: profile.id,
                    username: profile.username,
                    fullName: profile.fullName,
                    role: profile.role,
                },
            };
        } catch (error) {
            console.error('Login error:', error);
            console.error('Login error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: `Terjadi kesalahan saat login: ${errorMessage}` };
        }
    }

    /**
     * Logout current user
     */
    async logout(): Promise<{ success: boolean; error?: string }> {
        try {
            const supabase = await createClient();
            const { error } = await supabase.auth.signOut();

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: 'Terjadi kesalahan saat logout' };
        }
    }

    /**
     * Get current session and user profile
     */
    async getSession(): Promise<{ user: AuthResult['user'] | null }> {
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return { user: null };
            }

            // Get profile data
            const profile = await db.query.profiles.findFirst({
                where: eq(schema.profiles.id, user.id),
            });

            if (!profile) {
                return { user: null };
            }

            return {
                user: {
                    id: profile.id,
                    username: profile.username,
                    fullName: profile.fullName,
                    role: profile.role,
                },
            };
        } catch (error) {
            console.error('Get session error:', error);
            return { user: null };
        }
    }
}

export const authService = new AuthService();
