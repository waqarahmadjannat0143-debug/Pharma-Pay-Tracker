import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("free_beta"),
  betaEndsAt: timestamp("beta_ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const appUsersTable = pgTable(
  "app_users",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    username: text("username").notNull(),
    normalizedUsername: text("normalized_username").notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("owner"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    organizationIdIndex: index("app_users_organization_id_idx").on(
      table.organizationId,
    ),
    normalizedUsernameUnique: uniqueIndex(
      "app_users_normalized_username_unique",
    ).on(table.normalizedUsername),
    normalizedEmailUnique: uniqueIndex("app_users_normalized_email_unique").on(
      table.normalizedEmail,
    ),
  }),
);

export type Organization = typeof organizationsTable.$inferSelect;
export type AppUser = typeof appUsersTable.$inferSelect;
