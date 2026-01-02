import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core"

export const supportRequests = pgTable("support_requests", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    company: text("company").notNull(),
    contact: text("contact").notNull(), // Email or phone
    issue: text("issue").notNull(),
    status: text("status").default("pending").notNull(), // pending, in_progress, resolved
    createdAt: timestamp("created_at").defaultNow().notNull(),
})
