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

export const readingSessions = pgTable("reading_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id").notNull().references(() => books.id),
  startPage: integer("start_page").notNull(),
  endPage: integer("end_page").notNull(),
  sessionDate: timestamp("session_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  notes: text("notes"),
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
});

export const updateBookSchema = createInsertSchema(books).omit({
  id: true,
}).partial();

export const insertReadingSessionSchema = createInsertSchema(readingSessions).omit({
  id: true,
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type UpdateBook = z.infer<typeof updateBookSchema>;
export type Book = typeof books.$inferSelect;
export type ReadingSession = typeof readingSessions.$inferSelect;
export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;
