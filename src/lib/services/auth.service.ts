import { createClient } from '@/lib/supabase/server';

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
     * Uses Supabase REST API for profile lookup (more reliable during maintenance)
     */
    async login(credentials: LoginCredentials): Promise<AuthResult> {
        const { username, password, role } = credentials;

        try {
            const supabase = await createClient();

            // Step 1: Find user profile by username using Supabase REST API
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, full_name, role')
                .eq('username', username)
                .single();

            if (profileError || !profile) {
                console.error('[Auth] Profile lookup failed:', profileError?.message);
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

            const { error } = await supabase.auth.signInWithPassword({
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
                    fullName: profile.full_name,
                    role: profile.role,
                },
            };
        } catch (error) {
            console.error('Login error:', error);
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
     * Uses Supabase REST API for profile query (more reliable than direct DB connection)
     */
    async getSession(): Promise<{ user: AuthResult['user'] | null }> {
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return { user: null };
            }

            // Get profile data using Supabase REST API (more reliable during maintenance)
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, username, full_name, role')
                    .eq('id', user.id)
                    .single();

                if (profileError || !profile) {
                    console.warn('[Auth] Profile not found for user:', user.id, profileError?.message);
                    return { user: null };
                }

                return {
                    user: {
                        id: profile.id,
                        username: profile.username,
                        fullName: profile.full_name,
                        role: profile.role,
                    },
                };
            } catch (dbError) {
                // Database connection error - log but don't crash
                console.error('[Auth] Database error in getSession:', dbError);
                // Return null so user gets redirected to login
                return { user: null };
            }
        } catch (error) {
            console.error('Get session error:', error);
            return { user: null };
        }
    }
}

export const authService = new AuthService();
