import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  author: text("author").notNull(),
  genre: text("genre").notNull(),
  usefulness: text("usefulness"), // How the book might be useful
  totalPages: integer("total_pages"),
  isCurrentlyReading: boolean("is_currently_reading").default(false),
  currentPage: integer("current_page").default(0),
  notes: text("notes").array().default([]),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
});

export const updateBookSchema = createInsertSchema(books).omit({
  id: true,
}).partial();

export type InsertBook = z.infer<typeof insertBookSchema>;
export type UpdateBook = z.infer<typeof updateBookSchema>;
export type Book = typeof books.$inferSelect;
