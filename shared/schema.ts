import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  author: text("author").notNull(),
  genre: text("genre").notNull(),
  topics: text("topics").array().default([]),
  usefulness: text("usefulness"), // How the book might be useful
  totalPages: integer("total_pages"),
  isCurrentlyReading: boolean("is_currently_reading").default(false),
  currentPage: integer("current_page").default(0),
  notes: text("notes").array().default([]),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // New fields for enhanced library management
  status: text("status").notNull().default("toRead"), // 'toRead'|'reading'|'onHold'|'dnf'|'finished'
  priority: integer("priority").default(3), // 1-5 scale
  tags: text("tags").array().default([]),
  format: text("format").default("paper"), // 'paper'|'ebook'|'audio'
  language: text("language").default("English"),
  addedAt: timestamp("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastReadAt: timestamp("last_read_at"),
  progress: real("progress").default(0), // 0-1 decimal for percentage
  coverUrl: text("cover_url"),
});

export const readingSessions = pgTable("reading_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id").notNull().references(() => books.id),
  startPage: integer("start_page").notNull(),
  endPage: integer("end_page").notNull(),
  sessionDate: timestamp("session_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  notes: text("notes"),
});

// Define the fixed genre options
export const BOOK_GENRES = [
  "Fiction",
  "Self-Help / Personal Development", 
  "Business / Finance",
  "Philosophy / Spirituality",
  "Psychology / Self-Improvement",
  "History / Culture",
  "Science / Technology", 
  "General Non-Fiction",
  "Biography/Memoir"
] as const;

// Define book status options
export const BOOK_STATUSES = [
  "toRead",
  "reading", 
  "onHold",
  "dnf",
  "finished"
] as const;

// Define book format options
export const BOOK_FORMATS = [
  "paper",
  "ebook",
  "audio"
] as const;

export const genreEnum = z.enum(BOOK_GENRES);
export const statusEnum = z.enum(BOOK_STATUSES);
export const formatEnum = z.enum(BOOK_FORMATS);

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  addedAt: true, // Auto-generated
}).extend({
  genre: genreEnum,
  status: statusEnum.default("toRead"),
  format: formatEnum.default("paper"),
  priority: z.number().int().min(1).max(5).default(3),
  progress: z.number().min(0).max(1).default(0),
  language: z.string().default("English"),
  topics: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(15).default([]),
});

export const updateBookSchema = insertBookSchema.partial();

export const insertReadingSessionSchema = createInsertSchema(readingSessions).omit({
  id: true,
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type UpdateBook = z.infer<typeof updateBookSchema>;
export type Book = typeof books.$inferSelect;
export type ReadingSession = typeof readingSessions.$inferSelect;
export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;
