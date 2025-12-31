import { createAdminClient } from '@/lib/supabase/admin';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import type { Profile, NewProfile } from '@/lib/db/schema/users';

export interface CreateUserInput {
    username: string;
    password: string;
    fullName: string;
    role: 'admin' | 'manager' | 'analyst';
}

export interface UpdateUserInput {
    username?: string;
    fullName?: string;
    role?: 'admin' | 'manager' | 'analyst';
}

class UserService {
    /**
     * Get all users (admin only)
     */
    async getAll(): Promise<Profile[]> {
        const users = await db.query.profiles.findMany({
            orderBy: desc(schema.profiles.createdAt),
        });
        return users;
    }

    /**
     * Get user by ID
     */
    async getById(id: string): Promise<Profile | undefined> {
        const user = await db.query.profiles.findFirst({
            where: eq(schema.profiles.id, id),
        });
        return user;
    }

    /**
     * Get user by username
     */
    async getByUsername(username: string): Promise<Profile | undefined> {
        const user = await db.query.profiles.findFirst({
            where: eq(schema.profiles.username, username),
        });
        return user;
    }

    /**
     * Create new user (admin only)
     * Creates both Supabase Auth user and profile record
     */
    async create(input: CreateUserInput): Promise<{ success: boolean; user?: Profile; error?: string }> {
        const { username, password, fullName, role } = input;

        try {
            // Check if username already exists
            const existingUser = await this.getByUsername(username);
            if (existingUser) {
                return { success: false, error: 'Username sudah digunakan' };
            }

            // Create email from username for Supabase Auth
            const email = `${username.toLowerCase()}@labmania.local`;

            // Get admin Supabase client (uses service role key)
            const supabase = createAdminClient();

            // Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm email
            });

            if (authError || !authData.user) {
                return { success: false, error: authError?.message || 'Gagal membuat user' };
            }

            // Create profile record
            const [profile] = await db.insert(schema.profiles).values({
                id: authData.user.id,
                username,
                fullName,
                role,
            }).returning();

            return { success: true, user: profile };
        } catch (error) {
            console.error('Create user error:', error);
            return { success: false, error: 'Terjadi kesalahan saat membuat user' };
        }
    }

    /**
     * Update user (admin only)
     */
    async update(id: string, input: UpdateUserInput): Promise<{ success: boolean; user?: Profile; error?: string }> {
        try {
            // Check if user exists
            const existingUser = await this.getById(id);
            if (!existingUser) {
                return { success: false, error: 'User tidak ditemukan' };
            }

            // Check if new username is already taken
            if (input.username && input.username !== existingUser.username) {
                const userWithUsername = await this.getByUsername(input.username);
                if (userWithUsername) {
                    return { success: false, error: 'Username sudah digunakan' };
                }
            }

            // Update profile
            const [updatedProfile] = await db
                .update(schema.profiles)
                .set({
                    ...input,
                    updatedAt: new Date(),
                })
                .where(eq(schema.profiles.id, id))
                .returning();

            return { success: true, user: updatedProfile };
        } catch (error) {
            console.error('Update user error:', error);
            return { success: false, error: 'Terjadi kesalahan saat mengupdate user' };
        }
    }

    /**
     * Delete user (admin only)
     * Deletes both Supabase Auth user and profile record
     */
    async delete(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if user exists
            const existingUser = await this.getById(id);
            if (!existingUser) {
                return { success: false, error: 'User tidak ditemukan' };
            }

            // Delete from Supabase Auth
            const supabase = createAdminClient();
            const { error: authError } = await supabase.auth.admin.deleteUser(id);

            if (authError) {
                return { success: false, error: authError.message };
            }

            // Delete profile record
            await db.delete(schema.profiles).where(eq(schema.profiles.id, id));

            return { success: true };
        } catch (error) {
            console.error('Delete user error:', error);
            return { success: false, error: 'Terjadi kesalahan saat menghapus user' };
        }
    }
}

export const userService = new UserService();
