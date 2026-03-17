import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const searchFoldersTable = pgTable("search_folders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SearchFolder = typeof searchFoldersTable.$inferSelect;
export type NewSearchFolder = typeof searchFoldersTable.$inferInsert;
