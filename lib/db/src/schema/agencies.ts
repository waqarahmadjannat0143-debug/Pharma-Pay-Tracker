import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const agenciesTable = pgTable("agencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => ({
  normalizedNameUnique: uniqueIndex("agencies_normalized_name_unique").on(table.normalizedName),
}));

export type Agency = typeof agenciesTable.$inferSelect;
