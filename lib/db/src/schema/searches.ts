import { pgTable, serial, integer, text, json, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { searchFoldersTable } from "./searchFolders";

export const searchesTable = pgTable("searches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  folderId: integer("folder_id").references(() => searchFoldersTable.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(),
  query: text("query").notNull(),
  result: json("result").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Search = typeof searchesTable.$inferSelect;
export type NewSearch = typeof searchesTable.$inferInsert;
