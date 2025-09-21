import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, serial, date, uuid } from "drizzle-orm/pg-core";
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

// Enhanced reading sessions with state management and timer support
export const readingSessions = pgTable("reading_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id").notNull().references(() => books.id),
  
  // Session timing
  startedAt: timestamp("started_at").notNull(),
  pausedAt: timestamp("paused_at"),
  resumedAt: timestamp("resumed_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // Total reading time in minutes
  
  // Progress tracking
  startPage: integer("start_page"),
  endPage: integer("end_page"),
  pagesRead: integer("pages_read").default(0),
  progressPercent: real("progress_percent"), // For ebooks/audio
  
  // Session state and metadata
  state: text("state").notNull().default("completed"), // 'active'|'paused'|'completed'
  sessionType: text("session_type").default("timed"), // 'timed'|'quick'
  pomodoroMinutes: integer("pomodoro_minutes"), // Optional Pomodoro duration
  
  // Context
  sessionDate: timestamp("session_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  timeZone: text("time_zone").default("UTC"),
  deviceType: text("device_type"), // For offline sync context
  
  // Quick notes during session
  sessionNotes: text("session_notes"),
  
  // Sync status for offline support
  syncStatus: text("sync_status").default("synced"), // 'pending'|'syncing'|'synced'|'failed'
  localId: text("local_id"), // For offline session management
});

// Standalone notes and highlights
export const bookNotes = pgTable("book_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id").notNull().references(() => books.id),
  sessionId: varchar("session_id").references(() => readingSessions.id),
  
  // Content
  content: text("content").notNull(),
  noteType: text("note_type").notNull().default("note"), // 'note'|'quote'|'highlight'
  
  // Location context
  page: integer("page"),
  chapter: text("chapter"),
  position: text("position"), // For ebooks: chapter.paragraph.sentence
  
  // Metadata
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  tags: text("tags").array().default([]),
  isPrivate: boolean("is_private").default(false),
  
  // OCR/source tracking (for future camera quotes)
  sourceImage: text("source_image_url"),
  ocrConfidence: real("ocr_confidence"),
});

// Book reading state for active session management
export const bookReadingState = pgTable("book_reading_state", {
  bookId: varchar("book_id").primaryKey().references(() => books.id),
  
  // Current session info
  activeSessionId: varchar("active_session_id").references(() => readingSessions.id),
  lastSessionAt: timestamp("last_session_at"),
  
  // Reading pace and forecasting
  averagePagesPerHour: real("average_pages_per_hour"),
  recentSessionsCount: integer("recent_sessions_count").default(0),
  lastCalculatedAt: timestamp("last_calculated_at"),
  
  // Daily reading targets
  dailyPageTarget: integer("daily_page_target"),
  targetDeadline: timestamp("target_deadline"),
  estimatedFinishDate: timestamp("estimated_finish_date"),
  
  // Nudging and reminders  
  lastNudgeAt: timestamp("last_nudge_at"),
  nudgeDismissedAt: timestamp("nudge_dismissed_at"),
  reminderSettings: text("reminder_settings"), // JSON for time + bite preferences
});

// Daily reading statistics rollup tables for high-performance stats queries
export const dailyTotals = pgTable("daily_totals", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  pages: integer("pages").notNull().default(0),
  minutes: integer("minutes").notNull().default(0), 
  sessions: integer("sessions").notNull().default(0),
});

export const dailyBookTotals = pgTable("daily_book_totals", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  bookId: varchar("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  pages: integer("pages").notNull().default(0),
  minutes: integer("minutes").notNull().default(0),
  sessions: integer("sessions").notNull().default(0),
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

// Define session states
export const SESSION_STATES = [
  "active",
  "paused", 
  "completed"
] as const;

// Define session types
export const SESSION_TYPES = [
  "timed",
  "quick"
] as const;

// Define note types
export const NOTE_TYPES = [
  "note",
  "quote",
  "highlight",
  "summary",
  "action"
] as const;

// Define sync statuses
export const SYNC_STATUSES = [
  "pending",
  "syncing",
  "synced",
  "failed"
] as const;

export const genreEnum = z.enum(BOOK_GENRES);
export const statusEnum = z.enum(BOOK_STATUSES);
export const formatEnum = z.enum(BOOK_FORMATS);
export const sessionStateEnum = z.enum(SESSION_STATES);
export const sessionTypeEnum = z.enum(SESSION_TYPES);
export const noteTypeEnum = z.enum(NOTE_TYPES);
export const syncStatusEnum = z.enum(SYNC_STATUSES);

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

// Reading session schemas
export const insertReadingSessionSchema = createInsertSchema(readingSessions).omit({
  id: true,
  sessionDate: true, // Auto-generated
}).extend({
  state: sessionStateEnum.default("completed"),
  sessionType: sessionTypeEnum.default("timed"),
  syncStatus: syncStatusEnum.default("synced"),
  duration: z.number().int().min(0).optional(),
  pagesRead: z.number().int().min(0).default(0),
  progressPercent: z.number().min(0).max(1).optional(),
  pomodoroMinutes: z.number().int().min(5).max(120).optional(),
});

export const updateReadingSessionSchema = insertReadingSessionSchema.partial();

// Note schemas
export const insertBookNoteSchema = createInsertSchema(bookNotes).omit({
  id: true,
  createdAt: true, // Auto-generated
}).extend({
  noteType: noteTypeEnum.default("note"),
  content: z.string().min(1).max(5000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  page: z.number().int().min(1).optional(),
  ocrConfidence: z.number().min(0).max(1).optional(),
});

export const updateBookNoteSchema = insertBookNoteSchema.partial();

// Reading state schemas
export const insertBookReadingStateSchema = createInsertSchema(bookReadingState).omit({
  lastCalculatedAt: true, // Auto-updated
}).extend({
  averagePagesPerHour: z.number().min(0).optional(),
  recentSessionsCount: z.number().int().min(0).default(0),
  dailyPageTarget: z.number().int().min(1).optional(),
});

export const updateBookReadingStateSchema = insertBookReadingStateSchema.partial();

// Daily totals schemas
export const insertDailyTotalsSchema = createInsertSchema(dailyTotals).omit({
  id: true,
});

export const insertDailyBookTotalsSchema = createInsertSchema(dailyBookTotals).omit({
  id: true,
});

// Session action schemas for API endpoints
export const startSessionSchema = z.object({
  bookId: z.string().uuid(),
  startPage: z.number().int().min(0).optional(),
  pomodoroMinutes: z.number().int().min(5).max(120).optional(),
});

export const pauseSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export const stopSessionSchema = z.object({
  sessionId: z.string().uuid(),
  endPage: z.number().int().min(0).optional(),
  sessionNotes: z.string().max(1000).optional(),
});

export const quickAddPagesSchema = z.object({
  bookId: z.string().uuid(),
  pagesRead: z.number().int().min(1).max(100),
  sessionNotes: z.string().max(500).optional(),
});

// Type exports
export type InsertBook = z.infer<typeof insertBookSchema>;
export type UpdateBook = z.infer<typeof updateBookSchema>;
export type Book = typeof books.$inferSelect;

export type ReadingSession = typeof readingSessions.$inferSelect;
export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;
export type UpdateReadingSession = z.infer<typeof updateReadingSessionSchema>;

export type BookNote = typeof bookNotes.$inferSelect;
export type InsertBookNote = z.infer<typeof insertBookNoteSchema>;
export type UpdateBookNote = z.infer<typeof updateBookNoteSchema>;

export type BookReadingState = typeof bookReadingState.$inferSelect;
export type InsertBookReadingState = z.infer<typeof insertBookReadingStateSchema>;
export type UpdateBookReadingState = z.infer<typeof updateBookReadingStateSchema>;

export type DailyTotals = typeof dailyTotals.$inferSelect;
export type InsertDailyTotals = z.infer<typeof insertDailyTotalsSchema>;

export type DailyBookTotals = typeof dailyBookTotals.$inferSelect;
export type InsertDailyBookTotals = z.infer<typeof insertDailyBookTotalsSchema>;

// Action type exports
export type StartSessionRequest = z.infer<typeof startSessionSchema>;
export type PauseSessionRequest = z.infer<typeof pauseSessionSchema>;
export type StopSessionRequest = z.infer<typeof stopSessionSchema>;
export type QuickAddPagesRequest = z.infer<typeof quickAddPagesSchema>;
