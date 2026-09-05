import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  mobile: text("mobile").notNull(),
  gstNumber: text("gst_number"),
  address: text("address").notNull(),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  dueDays: integer("due_days").notNull().default(30),
  serialNumber: integer("serial_number").notNull(),
  registerNumber: integer("register_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
