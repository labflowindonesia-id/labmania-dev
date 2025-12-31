import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'analyst']);

// Profiles table (extends Supabase auth.users)
export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey(), // References auth.users.id
    username: varchar('username', { length: 50 }).unique().notNull(),
    fullName: varchar('full_name', { length: 100 }).notNull(),
    role: userRoleEnum('role').default('analyst').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
