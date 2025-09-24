import { 
  type Book, 
  type InsertBook, 
  type UpdateBook,
  type ReadingSession,
  type InsertReadingSession,
  type UpdateReadingSession,
  type BookNote,
  type InsertBookNote,
  type UpdateBookNote,
  type BookReadingState,
  type InsertBookReadingState,
  type UpdateBookReadingState,
  type DailyTotals,
  type InsertDailyTotals,
  type DailyBookTotals,
  type InsertDailyBookTotals,
  type ReadingGoal,
  type InsertReadingGoal,
  type UpdateReadingGoal,
  type StartSessionRequest,
  type PauseSessionRequest,
  type StopSessionRequest,
  type QuickAddPagesRequest,
  BOOK_STATUSES 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface BookFilters {
  search?: string;
  statuses?: string[];
  genres?: string[];
  tags?: string[];
  formats?: string[];
  languages?: string[];
  sort?: "priority" | "addedAt" | "title" | "author" | "lastReadAt" | "progress";
  sortOrder?: "asc" | "desc";
}

export interface SessionFilters {
  bookId?: string;
  dateRange?: { start: Date; end: Date };
  state?: string;
  sessionType?: string;
  limit?: number;
}

export interface IStorage {
  // Book operations
  getBook(id: string): Promise<Book | undefined>;
  getAllBooks(filters?: BookFilters): Promise<Book[]>;
  getCurrentlyReadingBooks(): Promise<Book[]>;
  getBooksByStatus(status: string): Promise<Book[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: string, updates: UpdateBook): Promise<Book | undefined>;
  updateBooksStatus(ids: string[], status: string): Promise<Book[]>;
  addTagsToBooks(ids: string[], tags: string[]): Promise<Book[]>;
  deleteBook(id: string): Promise<boolean>;
  deleteBooks(ids: string[]): Promise<boolean>;

  // Reading session operations
  getSession(id: string): Promise<ReadingSession | undefined>;
  getSessionsByBook(bookId: string, filters?: SessionFilters): Promise<ReadingSession[]>;
  getRecentSessions(limit?: number): Promise<ReadingSession[]>;
  getActiveSession(bookId: string): Promise<ReadingSession | undefined>;
  getAllActiveSessions(): Promise<ReadingSession[]>;
  createSession(session: InsertReadingSession): Promise<ReadingSession>;
  updateSession(id: string, updates: UpdateReadingSession): Promise<ReadingSession | undefined>;
  deleteSession(id: string): Promise<boolean>;

  // Session workflow operations
  startSession(request: StartSessionRequest): Promise<ReadingSession>;
  pauseSession(request: PauseSessionRequest): Promise<ReadingSession | undefined>;
  resumeSession(sessionId: string): Promise<ReadingSession | undefined>;
  stopSession(request: StopSessionRequest): Promise<ReadingSession | undefined>;
  quickAddPages(request: QuickAddPagesRequest): Promise<ReadingSession>;

  // Notes and quotes operations
  getNote(id: string): Promise<BookNote | undefined>;
  getNotesByBook(bookId: string): Promise<BookNote[]>;
  getNotesBySession(sessionId: string): Promise<BookNote[]>;
  createNote(note: InsertBookNote): Promise<BookNote>;
  updateNote(id: string, updates: UpdateBookNote): Promise<BookNote | undefined>;
  deleteNote(id: string): Promise<boolean>;

  // Reading state and progress operations
  getReadingState(bookId: string): Promise<BookReadingState | undefined>;
  updateReadingState(bookId: string, updates: UpdateBookReadingState): Promise<BookReadingState>;
  calculateProgress(bookId: string): Promise<{ averagePph: number; eta: Date | null; dailyTarget: number }>;
  updateBookProgress(bookId: string, currentPage?: number, progressPercent?: number): Promise<Book | undefined>;

  // Analytics and forecasting
  getReadingStats(bookId: string): Promise<{
    totalSessions: number;
    totalTimeMinutes: number;
    totalPagesRead: number;
    averagePagesPerHour: number;
    lastSession: Date | null;
  }>;
  getDailyReadingStats(date: Date): Promise<{
    sessionsCount: number;
    totalMinutes: number;
    totalPages: number;
    booksRead: string[];
  }>;

  // Daily totals operations for high-performance stats
  upsertDailyTotals(date: string, pages: number, minutes: number, sessions: number): Promise<DailyTotals>;
  upsertDailyBookTotals(date: string, bookId: string, pages: number, minutes: number, sessions: number): Promise<DailyBookTotals>;
  getDailyTotalsInRange(startDate: string, endDate: string): Promise<DailyTotals[]>;
  getDailyBookTotalsInRange(startDate: string, endDate: string, bookId?: string): Promise<DailyBookTotals[]>;

  // Reading Goals
  getAllReadingGoals(): Promise<ReadingGoal[]>;
  getReadingGoalById(id: string): Promise<ReadingGoal | null>;
  createReadingGoal(goal: InsertReadingGoal): Promise<ReadingGoal>;
  updateReadingGoal(id: string, updates: UpdateReadingGoal): Promise<ReadingGoal>;
  deleteReadingGoal(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private books: Map<string, Book>;
  private sessions: Map<string, ReadingSession>;
  private notes: Map<string, BookNote>;
  private readingStates: Map<string, BookReadingState>;
  private dailyTotals: Map<string, DailyTotals>;
  private dailyBookTotals: Map<string, DailyBookTotals>;
  private readingGoals: Map<string, ReadingGoal>;

  constructor() {
    this.books = new Map();
    this.sessions = new Map();
    this.notes = new Map();
    this.readingStates = new Map();
    this.dailyTotals = new Map();
    this.dailyBookTotals = new Map();
    this.readingGoals = new Map();
  }

  async getBook(id: string): Promise<Book | undefined> {
    return this.books.get(id);
  }

  async getAllBooks(filters?: BookFilters): Promise<Book[]> {
    let books = Array.from(this.books.values());

    if (filters) {
      // Apply search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        books = books.filter(book => 
          book.title.toLowerCase().includes(searchLower) ||
          book.author.toLowerCase().includes(searchLower) ||
          (book.topics || []).some(topic => topic.toLowerCase().includes(searchLower)) ||
          (book.tags || []).some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      // Apply status filter
      if (filters.statuses && filters.statuses.length > 0) {
        books = books.filter(book => filters.statuses!.includes(book.status));
      }

      // Apply genre filter
      if (filters.genres && filters.genres.length > 0) {
        books = books.filter(book => filters.genres!.includes(book.genre));
      }

      // Apply tags filter
      if (filters.tags && filters.tags.length > 0) {
        books = books.filter(book => 
          filters.tags!.some(tag => (book.tags || []).includes(tag))
        );
      }

      // Apply format filter
      if (filters.formats && filters.formats.length > 0) {
        books = books.filter(book => book.format && filters.formats!.includes(book.format));
      }

      // Apply language filter
      if (filters.languages && filters.languages.length > 0) {
        books = books.filter(book => book.language && filters.languages!.includes(book.language));
      }

      // Apply sorting
      if (filters.sort) {
        const sortOrder = filters.sortOrder || "desc";
        books.sort((a, b) => {
          let aVal: any, bVal: any;
          
          switch (filters.sort) {
            case "priority":
              aVal = a.priority || 3;
              bVal = b.priority || 3;
              break;
            case "addedAt":
              aVal = a.addedAt?.getTime() || 0;
              bVal = b.addedAt?.getTime() || 0;
              break;
            case "title":
              aVal = a.title.toLowerCase();
              bVal = b.title.toLowerCase();
              break;
            case "author":
              aVal = a.author.toLowerCase();
              bVal = b.author.toLowerCase();
              break;
            case "lastReadAt":
              aVal = a.lastReadAt?.getTime() || 0;
              bVal = b.lastReadAt?.getTime() || 0;
              break;
            case "progress":
              aVal = a.progress || 0;
              bVal = b.progress || 0;
              break;
            default:
              return 0;
          }

          if (sortOrder === "asc") {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
          }
        });
      }
    }

    return books;
  }

  async getCurrentlyReadingBooks(): Promise<Book[]> {
    return Array.from(this.books.values()).filter(book => book.status === "reading");
  }

  async getBooksByStatus(status: string): Promise<Book[]> {
    return Array.from(this.books.values()).filter(book => book.status === status);
  }

  async updateBooksStatus(ids: string[], status: string): Promise<Book[]> {
    const updatedBooks: Book[] = [];
    for (const id of ids) {
      const book = this.books.get(id);
      if (book) {
        const updatedBook = { 
          ...book, 
          status,
          lastReadAt: status === "reading" ? new Date() : book.lastReadAt,
          completedAt: status === "finished" ? new Date() : null
        };
        this.books.set(id, updatedBook);
        updatedBooks.push(updatedBook);
      }
    }
    return updatedBooks;
  }

  async addTagsToBooks(ids: string[], tags: string[]): Promise<Book[]> {
    const updatedBooks: Book[] = [];
    for (const id of ids) {
      const book = this.books.get(id);
      if (book) {
        const existingTags = book.tags || [];
        const combinedTags = [...existingTags, ...tags];
        const newTags = Array.from(new Set(combinedTags)); // Deduplicate
        const updatedBook = { ...book, tags: newTags };
        this.books.set(id, updatedBook);
        updatedBooks.push(updatedBook);
      }
    }
    return updatedBooks;
  }

  async deleteBooks(ids: string[]): Promise<boolean> {
    let allDeleted = true;
    for (const id of ids) {
      if (!this.books.delete(id)) {
        allDeleted = false;
      }
    }
    return allDeleted;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const id = randomUUID();
    const now = new Date();
    const book: Book = { 
      ...insertBook, 
      id,
      currentPage: insertBook.currentPage || 0,
      isCurrentlyReading: insertBook.isCurrentlyReading || false,
      notes: insertBook.notes || [],
      topics: insertBook.topics || [],
      tags: insertBook.tags || [],
      usefulness: insertBook.usefulness || null,
      totalPages: insertBook.totalPages || null,
      startedAt: insertBook.startedAt || null,
      completedAt: insertBook.completedAt || null,
      status: insertBook.status || "toRead",
      priority: insertBook.priority || 3,
      format: insertBook.format || "paper",
      language: insertBook.language || "English",
      addedAt: now,
      lastReadAt: insertBook.lastReadAt || null,
      progress: insertBook.progress || 0,
      coverUrl: insertBook.coverUrl || null,
    };
    this.books.set(id, book);
    return book;
  }

  async updateBook(id: string, updates: UpdateBook): Promise<Book | undefined> {
    const existingBook = this.books.get(id);
    if (!existingBook) return undefined;
    
    const updatedBook: Book = { ...existingBook, ...updates };
    this.books.set(id, updatedBook);
    return updatedBook;
  }

  async deleteBook(id: string): Promise<boolean> {
    const deleted = this.books.delete(id);
    
    // Clean up related data
    if (deleted) {
      // Delete all sessions for this book
      Array.from(this.sessions.entries()).forEach(([sessionId, session]) => {
        if (session.bookId === id) {
          this.sessions.delete(sessionId);
        }
      });
      
      // Delete all notes for this book
      Array.from(this.notes.entries()).forEach(([noteId, note]) => {
        if (note.bookId === id) {
          this.notes.delete(noteId);
        }
      });
      
      // Delete reading state
      this.readingStates.delete(id);
    }
    
    return deleted;
  }

  // Reading session operations
  async getSession(id: string): Promise<ReadingSession | undefined> {
    return this.sessions.get(id);
  }

  async getSessionsByBook(bookId: string, filters?: SessionFilters): Promise<ReadingSession[]> {
    let sessions = Array.from(this.sessions.values()).filter(session => session.bookId === bookId);

    if (filters) {
      if (filters.state) {
        sessions = sessions.filter(session => session.state === filters.state);
      }
      
      if (filters.sessionType) {
        sessions = sessions.filter(session => session.sessionType === filters.sessionType);
      }
      
      if (filters.dateRange) {
        sessions = sessions.filter(session => 
          session.sessionDate >= filters.dateRange!.start && 
          session.sessionDate <= filters.dateRange!.end
        );
      }
      
      if (filters.limit) {
        sessions = sessions.slice(0, filters.limit);
      }
    }

    // Sort by session date descending
    return sessions.sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime());
  }

  async getRecentSessions(limit = 10): Promise<ReadingSession[]> {
    const sessions = Array.from(this.sessions.values());
    return sessions
      .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime())
      .slice(0, limit);
  }

  async getActiveSession(bookId: string): Promise<ReadingSession | undefined> {
    return Array.from(this.sessions.values()).find(session => 
      session.bookId === bookId && (session.state === "active" || session.state === "paused")
    );
  }

  async getAllActiveSessions(): Promise<ReadingSession[]> {
    return Array.from(this.sessions.values()).filter(session => 
      session.state === "active" || session.state === "paused"
    );
  }

  async createSession(insertSession: InsertReadingSession): Promise<ReadingSession> {
    const id = randomUUID();
    const now = new Date();
    
    const session: ReadingSession = {
      ...insertSession,
      id,
      sessionDate: now,
      timeZone: insertSession.timeZone || "UTC",
      state: insertSession.state || "completed",
      sessionType: insertSession.sessionType || "timed",
      pagesRead: insertSession.pagesRead || 0,
      syncStatus: insertSession.syncStatus || "synced",
      startPage: insertSession.startPage || null,
      endPage: insertSession.endPage || null,
      pausedAt: insertSession.pausedAt || null,
      resumedAt: insertSession.resumedAt || null,
      endedAt: insertSession.endedAt || null,
      duration: insertSession.duration || null,
      progressPercent: insertSession.progressPercent || null,
      pomodoroMinutes: insertSession.pomodoroMinutes || null,
      sessionNotes: insertSession.sessionNotes || null,
      deviceType: insertSession.deviceType || null,
      localId: insertSession.localId || null,
    };
    
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: string, updates: UpdateReadingSession): Promise<ReadingSession | undefined> {
    const existingSession = this.sessions.get(id);
    if (!existingSession) return undefined;
    
    const updatedSession: ReadingSession = { ...existingSession, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  // Session workflow operations
  async startSession(request: StartSessionRequest): Promise<ReadingSession> {
    const now = new Date();
    
    // Check if there's already an active session for this book
    const existingActive = await this.getActiveSession(request.bookId);
    if (existingActive) {
      throw new Error("Book already has an active session");
    }
    
    // Get the book and current reading state
    const book = await this.getBook(request.bookId);
    if (!book) {
      throw new Error("Book not found");
    }
    
    const readingState = await this.getReadingState(request.bookId);
    
    // Auto-fill start page from last session or current page
    let startPage = request.startPage;
    if (!startPage && book.format === "paper") {
      if (readingState) {
        const lastSession = await this.getSessionsByBook(request.bookId, { limit: 1 });
        startPage = lastSession[0]?.endPage || book.currentPage || 0;
      } else {
        startPage = book.currentPage || 0;
      }
    }
    
    const session = await this.createSession({
      bookId: request.bookId,
      startedAt: now,
      startPage,
      state: "active",
      sessionType: "timed",
      pagesRead: 0,
      syncStatus: "synced",
      pomodoroMinutes: request.pomodoroMinutes,
    });
    
    // Update book status and reading state
    await this.updateBook(request.bookId, { 
      status: "reading",
      lastReadAt: now 
    });
    
    await this.updateReadingState(request.bookId, {
      activeSessionId: session.id,
      lastSessionAt: now,
    });
    
    return session;
  }

  async pauseSession(request: PauseSessionRequest): Promise<ReadingSession | undefined> {
    const session = await this.getSession(request.sessionId);
    if (!session || session.state !== "active") {
      return undefined;
    }
    
    return await this.updateSession(request.sessionId, {
      state: "paused",
      pausedAt: new Date(),
    });
  }

  async resumeSession(sessionId: string): Promise<ReadingSession | undefined> {
    const session = await this.getSession(sessionId);
    if (!session || session.state !== "paused") {
      return undefined;
    }
    
    return await this.updateSession(sessionId, {
      state: "active",
      resumedAt: new Date(),
    });
  }

  async stopSession(request: StopSessionRequest): Promise<ReadingSession | undefined> {
    const session = await this.getSession(request.sessionId);
    if (!session || (session.state !== "active" && session.state !== "paused")) {
      return undefined;
    }
    
    const now = new Date();
    const startTime = session.startedAt.getTime();
    const pauseTime = session.pausedAt?.getTime() || 0;
    const resumeTime = session.resumedAt?.getTime() || 0;
    
    // Calculate total duration accounting for pauses
    let totalDuration = (now.getTime() - startTime) / (1000 * 60); // minutes
    if (pauseTime && resumeTime) {
      totalDuration -= (resumeTime - pauseTime) / (1000 * 60);
    } else if (pauseTime) {
      totalDuration = (pauseTime - startTime) / (1000 * 60);
    }
    
    // Calculate pages read
    let pagesRead = 0;
    let endPage = request.endPage;
    
    if (session.startPage && endPage) {
      pagesRead = Math.max(0, endPage - session.startPage);
    }
    
    const updatedSession = await this.updateSession(request.sessionId, {
      state: "completed",
      endedAt: now,
      endPage,
      pagesRead,
      duration: Math.round(totalDuration),
      sessionNotes: request.sessionNotes,
    });
    
    // Update book progress
    if (updatedSession && endPage) {
      await this.updateBookProgress(session.bookId, endPage);
    }
    
    // Update reading state
    await this.updateReadingState(session.bookId, {
      activeSessionId: null,
      lastSessionAt: now,
    });
    
    // Recalculate reading pace
    await this.calculateProgress(session.bookId);
    
    return updatedSession;
  }

  async quickAddPages(request: QuickAddPagesRequest): Promise<ReadingSession> {
    const book = await this.getBook(request.bookId);
    if (!book) {
      throw new Error("Book not found");
    }
    
    const now = new Date();
    const currentPage = book.currentPage || 0;
    const newCurrentPage = currentPage + request.pagesRead;
    
    // Create a quick session
    const session = await this.createSession({
      bookId: request.bookId,
      startedAt: now,
      endedAt: now,
      startPage: currentPage,
      endPage: newCurrentPage,
      pagesRead: request.pagesRead,
      state: "completed",
      sessionType: "quick",
      syncStatus: "synced",
      duration: undefined, // No timer for quick adds
      sessionNotes: request.sessionNotes,
    });
    
    // Update book progress
    await this.updateBookProgress(request.bookId, newCurrentPage);
    
    // Update reading state
    await this.updateReadingState(request.bookId, {
      lastSessionAt: now,
    });
    
    return session;
  }

  // Notes and quotes operations
  async getNote(id: string): Promise<BookNote | undefined> {
    return this.notes.get(id);
  }

  async getNotesByBook(bookId: string): Promise<BookNote[]> {
    return Array.from(this.notes.values())
      .filter(note => note.bookId === bookId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getNotesBySession(sessionId: string): Promise<BookNote[]> {
    return Array.from(this.notes.values())
      .filter(note => note.sessionId === sessionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNote(insertNote: InsertBookNote): Promise<BookNote> {
    const id = randomUUID();
    const now = new Date();
    
    const note: BookNote = {
      ...insertNote,
      id,
      createdAt: now,
      noteType: insertNote.noteType || "note",
      tags: insertNote.tags || [],
      isPrivate: insertNote.isPrivate || false,
      page: insertNote.page || null,
      chapter: insertNote.chapter || null,
      position: insertNote.position || null,
      sessionId: insertNote.sessionId || null,
      sourceImage: insertNote.sourceImage || null,
      ocrConfidence: insertNote.ocrConfidence || null,
    };
    
    this.notes.set(id, note);
    return note;
  }

  async updateNote(id: string, updates: UpdateBookNote): Promise<BookNote | undefined> {
    const existingNote = this.notes.get(id);
    if (!existingNote) return undefined;
    
    const updatedNote: BookNote = { ...existingNote, ...updates };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }

  async deleteNote(id: string): Promise<boolean> {
    return this.notes.delete(id);
  }

  // Reading state and progress operations
  async getReadingState(bookId: string): Promise<BookReadingState | undefined> {
    return this.readingStates.get(bookId);
  }

  async updateReadingState(bookId: string, updates: UpdateBookReadingState): Promise<BookReadingState> {
    const existing = this.readingStates.get(bookId);
    const now = new Date();
    
    const readingState: BookReadingState = {
      bookId,
      activeSessionId: null,
      lastSessionAt: null,
      averagePagesPerHour: null,
      recentSessionsCount: 0,
      lastCalculatedAt: null,
      dailyPageTarget: null,
      targetDeadline: null,
      estimatedFinishDate: null,
      lastNudgeAt: null,
      nudgeDismissedAt: null,
      reminderSettings: null,
      ...existing,
      ...updates,
    };
    
    this.readingStates.set(bookId, readingState);
    return readingState;
  }

  async calculateProgress(bookId: string): Promise<{ averagePph: number; eta: Date | null; dailyTarget: number }> {
    const sessions = await this.getSessionsByBook(bookId, { limit: 5 });
    const book = await this.getBook(bookId);
    
    if (!book || sessions.length === 0) {
      return { averagePph: 0, eta: null, dailyTarget: 0 };
    }
    
    // Calculate average pages per hour from recent sessions
    const validSessions = sessions.filter(s => s.duration && s.pagesRead && s.duration > 0);
    
    let averagePph = 0;
    if (validSessions.length > 0) {
      const totalPages = validSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
      const totalHours = validSessions.reduce((sum, s) => sum + ((s.duration || 0) / 60), 0);
      averagePph = totalHours > 0 ? totalPages / totalHours : 0;
    }
    
    // Calculate ETA
    let eta: Date | null = null;
    if (book.totalPages && book.currentPage && averagePph > 0) {
      const remainingPages = book.totalPages - book.currentPage;
      const hoursNeeded = remainingPages / averagePph;
      const msNeeded = hoursNeeded * 60 * 60 * 1000;
      eta = new Date(Date.now() + msNeeded);
    }
    
    // Calculate daily target (simplified)
    const dailyTarget = Math.max(1, Math.round(averagePph * 0.5)); // 30 minutes of reading
    
    // Update reading state
    await this.updateReadingState(bookId, {
      averagePagesPerHour: averagePph,
      recentSessionsCount: validSessions.length,
      estimatedFinishDate: eta,
      dailyPageTarget: dailyTarget,
    });
    
    return { averagePph, eta, dailyTarget };
  }

  async updateBookProgress(bookId: string, currentPage?: number, progressPercent?: number): Promise<Book | undefined> {
    const book = await this.getBook(bookId);
    if (!book) return undefined;
    
    const updates: UpdateBook = { lastReadAt: new Date() };
    
    if (currentPage !== undefined) {
      updates.currentPage = currentPage;
      
      // Calculate progress percentage for paper books
      if (book.totalPages && book.totalPages > 0) {
        updates.progress = currentPage / book.totalPages;
      }
    }
    
    if (progressPercent !== undefined) {
      updates.progress = progressPercent;
    }
    
    // Check if book is finished
    if (updates.progress && updates.progress >= 1) {
      updates.status = "finished";
      updates.completedAt = new Date();
    }
    
    return await this.updateBook(bookId, updates);
  }

  // Analytics and forecasting
  async getReadingStats(bookId: string): Promise<{
    totalSessions: number;
    totalTimeMinutes: number;
    totalPagesRead: number;
    averagePagesPerHour: number;
    lastSession: Date | null;
  }> {
    const sessions = await this.getSessionsByBook(bookId);
    const completedSessions = sessions.filter(s => s.state === "completed");
    
    const totalSessions = completedSessions.length;
    const totalTimeMinutes = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalPagesRead = completedSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const averagePagesPerHour = totalTimeMinutes > 0 ? (totalPagesRead / totalTimeMinutes) * 60 : 0;
    const lastSession = sessions.length > 0 ? sessions[0].sessionDate : null;
    
    return {
      totalSessions,
      totalTimeMinutes,
      totalPagesRead,
      averagePagesPerHour,
      lastSession,
    };
  }

  async getDailyReadingStats(date: Date): Promise<{
    sessionsCount: number;
    totalMinutes: number;
    totalPages: number;
    booksRead: string[];
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const dailySessions = Array.from(this.sessions.values()).filter(session =>
      session.sessionDate >= startOfDay && session.sessionDate <= endOfDay && session.state === "completed"
    );
    
    const sessionsCount = dailySessions.length;
    const totalMinutes = dailySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalPages = dailySessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const booksRead = Array.from(new Set(dailySessions.map(s => s.bookId)));
    
    return {
      sessionsCount,
      totalMinutes,
      totalPages,
      booksRead,
    };
  }

  // Daily totals operations for high-performance stats
  async upsertDailyTotals(date: string, pages: number, minutes: number, sessions: number): Promise<DailyTotals> {
    const existing = this.dailyTotals.get(date);
    
    if (existing) {
      // Update existing totals
      const updated: DailyTotals = {
        ...existing,
        pages: existing.pages + pages,
        minutes: existing.minutes + minutes,
        sessions: existing.sessions + sessions,
      };
      this.dailyTotals.set(date, updated);
      return updated;
    } else {
      // Create new daily total
      const newTotal: DailyTotals = {
        id: this.dailyTotals.size + 1, // Simple increment for memory storage
        date,
        pages,
        minutes,
        sessions,
      };
      this.dailyTotals.set(date, newTotal);
      return newTotal;
    }
  }

  async upsertDailyBookTotals(date: string, bookId: string, pages: number, minutes: number, sessions: number): Promise<DailyBookTotals> {
    const key = `${date}:${bookId}`;
    const existing = this.dailyBookTotals.get(key);
    
    if (existing) {
      // Update existing book totals
      const updated: DailyBookTotals = {
        ...existing,
        pages: existing.pages + pages,
        minutes: existing.minutes + minutes,
        sessions: existing.sessions + sessions,
      };
      this.dailyBookTotals.set(key, updated);
      return updated;
    } else {
      // Create new daily book total
      const newTotal: DailyBookTotals = {
        id: this.dailyBookTotals.size + 1, // Simple increment for memory storage
        date,
        bookId,
        pages,
        minutes,
        sessions,
      };
      this.dailyBookTotals.set(key, newTotal);
      return newTotal;
    }
  }

  async getDailyTotalsInRange(startDate: string, endDate: string): Promise<DailyTotals[]> {
    return Array.from(this.dailyTotals.values()).filter(total => 
      total.date >= startDate && total.date <= endDate
    ).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getDailyBookTotalsInRange(startDate: string, endDate: string, bookId?: string): Promise<DailyBookTotals[]> {
    let totals = Array.from(this.dailyBookTotals.values()).filter(total => 
      total.date >= startDate && total.date <= endDate
    );
    
    if (bookId) {
      totals = totals.filter(total => total.bookId === bookId);
    }
    
    return totals.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Reading Goals Implementation
  async getAllReadingGoals(): Promise<ReadingGoal[]> {
    return Array.from(this.readingGoals.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getReadingGoalById(id: string): Promise<ReadingGoal | null> {
    return this.readingGoals.get(id) || null;
  }

  async createReadingGoal(goal: InsertReadingGoal): Promise<ReadingGoal> {
    const newGoal: ReadingGoal = {
      id: randomUUID(),
      ...goal,
      current: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.readingGoals.set(newGoal.id, newGoal);
    return newGoal;
  }

  async updateReadingGoal(id: string, updates: UpdateReadingGoal): Promise<ReadingGoal> {
    const existing = this.readingGoals.get(id);
    if (!existing) {
      throw new Error(`Reading goal with id ${id} not found`);
    }
    
    const updated: ReadingGoal = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.readingGoals.set(id, updated);
    return updated;
  }

  async deleteReadingGoal(id: string): Promise<void> {
    if (!this.readingGoals.has(id)) {
      throw new Error(`Reading goal with id ${id} not found`);
    }
    this.readingGoals.delete(id);
  }
}

import { FileStorage } from './storage/FileStorage';

export const storage = process.env.LOCAL_PERSIST === '1' ? new FileStorage() : new MemStorage();
