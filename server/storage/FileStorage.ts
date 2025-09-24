import { promises as fs } from 'fs';
import { join, dirname } from 'path';
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
import { IStorage, BookFilters, SessionFilters } from "../storage";

interface FileData {
  books: Record<string, Book>;
  sessions: Record<string, ReadingSession>;
  notes: Record<string, BookNote>;
  readingStates: Record<string, BookReadingState>;
  dailyTotals: Record<string, DailyTotals>;
  dailyBookTotals: Record<string, DailyBookTotals>;
  readingGoals: Record<string, ReadingGoal>;
}

export class FileStorage implements IStorage {
  private dataPath: string;
  private data: FileData;

  constructor(dataPath = './data/store.json') {
    this.dataPath = dataPath;
    this.data = {
      books: {},
      sessions: {},
      notes: {},
      readingStates: {},
      dailyTotals: {},
      dailyBookTotals: {},
      readingGoals: {},
    };
  }

  private async ensureDataDir(): Promise<void> {
    const dir = dirname(this.dataPath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async loadData(): Promise<void> {
    try {
      await this.ensureDataDir();
      const content = await fs.readFile(this.dataPath, 'utf-8');
      this.data = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty data
      this.data = {
        books: {},
        sessions: {},
        notes: {},
        readingStates: {},
        dailyTotals: {},
        dailyBookTotals: {},
        readingGoals: {},
      };
    }
  }

  private async saveData(): Promise<void> {
    await this.ensureDataDir();
    const content = JSON.stringify(this.data, null, 2);
    const tempPath = this.dataPath + '.tmp';
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, this.dataPath);
  }

  private async ensureLoaded(): Promise<void> {
    if (Object.keys(this.data.books).length === 0 && Object.keys(this.data.sessions).length === 0) {
      await this.loadData();
    }
  }

  // Book operations
  async getBook(id: string): Promise<Book | undefined> {
    await this.ensureLoaded();
    return this.data.books[id];
  }

  async getAllBooks(filters?: BookFilters): Promise<Book[]> {
    await this.ensureLoaded();
    let books = Object.values(this.data.books);

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
    await this.ensureLoaded();
    return Object.values(this.data.books).filter(book => book.status === "reading");
  }

  async getBooksByStatus(status: string): Promise<Book[]> {
    await this.ensureLoaded();
    return Object.values(this.data.books).filter(book => book.status === status);
  }

  async updateBooksStatus(ids: string[], status: string): Promise<Book[]> {
    await this.ensureLoaded();
    const updatedBooks: Book[] = [];
    for (const id of ids) {
      const book = this.data.books[id];
      if (book) {
        const updatedBook = { 
          ...book, 
          status,
          lastReadAt: status === "reading" ? new Date() : book.lastReadAt,
          completedAt: status === "finished" ? new Date() : null
        };
        this.data.books[id] = updatedBook;
        updatedBooks.push(updatedBook);
      }
    }
    await this.saveData();
    return updatedBooks;
  }

  async addTagsToBooks(ids: string[], tags: string[]): Promise<Book[]> {
    await this.ensureLoaded();
    const updatedBooks: Book[] = [];
    for (const id of ids) {
      const book = this.data.books[id];
      if (book) {
        const existingTags = book.tags || [];
        const combinedTags = [...existingTags, ...tags];
        const newTags = Array.from(new Set(combinedTags)); // Deduplicate
        const updatedBook = { ...book, tags: newTags };
        this.data.books[id] = updatedBook;
        updatedBooks.push(updatedBook);
      }
    }
    await this.saveData();
    return updatedBooks;
  }

  async deleteBooks(ids: string[]): Promise<boolean> {
    await this.ensureLoaded();
    let allDeleted = true;
    for (const id of ids) {
      if (this.data.books[id]) {
        delete this.data.books[id];
      } else {
        allDeleted = false;
      }
    }
    await this.saveData();
    return allDeleted;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    await this.ensureLoaded();
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
    this.data.books[id] = book;
    await this.saveData();
    return book;
  }

  async updateBook(id: string, updates: UpdateBook): Promise<Book | undefined> {
    await this.ensureLoaded();
    const existingBook = this.data.books[id];
    if (!existingBook) return undefined;
    
    const updatedBook: Book = { ...existingBook, ...updates };
    this.data.books[id] = updatedBook;
    await this.saveData();
    return updatedBook;
  }

  async deleteBook(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = !!this.data.books[id];
    
    if (deleted) {
      delete this.data.books[id];
      
      // Clean up related data
      Object.keys(this.data.sessions).forEach(sessionId => {
        if (this.data.sessions[sessionId].bookId === id) {
          delete this.data.sessions[sessionId];
        }
      });
      
      Object.keys(this.data.notes).forEach(noteId => {
        if (this.data.notes[noteId].bookId === id) {
          delete this.data.notes[noteId];
        }
      });
      
      delete this.data.readingStates[id];
    }
    
    await this.saveData();
    return deleted;
  }

  // Reading session operations
  async getSession(id: string): Promise<ReadingSession | undefined> {
    await this.ensureLoaded();
    return this.data.sessions[id];
  }

  async getSessionsByBook(bookId: string, filters?: SessionFilters): Promise<ReadingSession[]> {
    await this.ensureLoaded();
    let sessions = Object.values(this.data.sessions).filter(session => session.bookId === bookId);

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
    await this.ensureLoaded();
    const sessions = Object.values(this.data.sessions);
    return sessions
      .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime())
      .slice(0, limit);
  }

  async getActiveSession(bookId: string): Promise<ReadingSession | undefined> {
    await this.ensureLoaded();
    return Object.values(this.data.sessions).find(session => 
      session.bookId === bookId && (session.state === "active" || session.state === "paused")
    );
  }

  async getAllActiveSessions(): Promise<ReadingSession[]> {
    await this.ensureLoaded();
    return Object.values(this.data.sessions).filter(session => 
      session.state === "active" || session.state === "paused"
    );
  }

  async createSession(insertSession: InsertReadingSession): Promise<ReadingSession> {
    await this.ensureLoaded();
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
    
    this.data.sessions[id] = session;
    await this.saveData();
    return session;
  }

  async updateSession(id: string, updates: UpdateReadingSession): Promise<ReadingSession | undefined> {
    await this.ensureLoaded();
    const existingSession = this.data.sessions[id];
    if (!existingSession) return undefined;
    
    const updatedSession: ReadingSession = { ...existingSession, ...updates };
    this.data.sessions[id] = updatedSession;
    await this.saveData();
    return updatedSession;
  }

  async deleteSession(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = !!this.data.sessions[id];
    if (deleted) {
      delete this.data.sessions[id];
      await this.saveData();
    }
    return deleted;
  }

  // Session workflow operations
  async startSession(request: StartSessionRequest): Promise<ReadingSession> {
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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
    await this.ensureLoaded();
    return this.data.notes[id];
  }

  async getNotesByBook(bookId: string): Promise<BookNote[]> {
    await this.ensureLoaded();
    return Object.values(this.data.notes)
      .filter(note => note.bookId === bookId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getNotesBySession(sessionId: string): Promise<BookNote[]> {
    await this.ensureLoaded();
    return Object.values(this.data.notes)
      .filter(note => note.sessionId === sessionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNote(insertNote: InsertBookNote): Promise<BookNote> {
    await this.ensureLoaded();
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
    
    this.data.notes[id] = note;
    await this.saveData();
    return note;
  }

  async updateNote(id: string, updates: UpdateBookNote): Promise<BookNote | undefined> {
    await this.ensureLoaded();
    const existingNote = this.data.notes[id];
    if (!existingNote) return undefined;
    
    const updatedNote: BookNote = { ...existingNote, ...updates };
    this.data.notes[id] = updatedNote;
    await this.saveData();
    return updatedNote;
  }

  async deleteNote(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = !!this.data.notes[id];
    if (deleted) {
      delete this.data.notes[id];
      await this.saveData();
    }
    return deleted;
  }

  // Reading state and progress operations
  async getReadingState(bookId: string): Promise<BookReadingState | undefined> {
    await this.ensureLoaded();
    return this.data.readingStates[bookId];
  }

  async updateReadingState(bookId: string, updates: UpdateBookReadingState): Promise<BookReadingState> {
    await this.ensureLoaded();
    const existing = this.data.readingStates[bookId];
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
    
    this.data.readingStates[bookId] = readingState;
    await this.saveData();
    return readingState;
  }

  async calculateProgress(bookId: string): Promise<{ averagePph: number; eta: Date | null; dailyTarget: number }> {
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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
    await this.ensureLoaded();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const dailySessions = Object.values(this.data.sessions).filter(session =>
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
    await this.ensureLoaded();
    const existing = this.data.dailyTotals[date];
    
    if (existing) {
      // Update existing totals
      const updated: DailyTotals = {
        ...existing,
        pages: existing.pages + pages,
        minutes: existing.minutes + minutes,
        sessions: existing.sessions + sessions,
      };
      this.data.dailyTotals[date] = updated;
      await this.saveData();
      return updated;
    } else {
      // Create new daily total
      const newTotal: DailyTotals = {
        id: Object.keys(this.data.dailyTotals).length + 1, // Simple increment for file storage
        date,
        pages,
        minutes,
        sessions,
      };
      this.data.dailyTotals[date] = newTotal;
      await this.saveData();
      return newTotal;
    }
  }

  async upsertDailyBookTotals(date: string, bookId: string, pages: number, minutes: number, sessions: number): Promise<DailyBookTotals> {
    await this.ensureLoaded();
    const key = `${date}:${bookId}`;
    const existing = this.data.dailyBookTotals[key];
    
    if (existing) {
      // Update existing book totals
      const updated: DailyBookTotals = {
        ...existing,
        pages: existing.pages + pages,
        minutes: existing.minutes + minutes,
        sessions: existing.sessions + sessions,
      };
      this.data.dailyBookTotals[key] = updated;
      await this.saveData();
      return updated;
    } else {
      // Create new daily book total
      const newTotal: DailyBookTotals = {
        id: Object.keys(this.data.dailyBookTotals).length + 1, // Simple increment for file storage
        date,
        bookId,
        pages,
        minutes,
        sessions,
      };
      this.data.dailyBookTotals[key] = newTotal;
      await this.saveData();
      return newTotal;
    }
  }

  async getDailyTotalsInRange(startDate: string, endDate: string): Promise<DailyTotals[]> {
    await this.ensureLoaded();
    return Object.values(this.data.dailyTotals).filter(total => 
      total.date >= startDate && total.date <= endDate
    ).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getDailyBookTotalsInRange(startDate: string, endDate: string, bookId?: string): Promise<DailyBookTotals[]> {
    await this.ensureLoaded();
    let totals = Object.values(this.data.dailyBookTotals).filter(total => 
      total.date >= startDate && total.date <= endDate
    );
    
    if (bookId) {
      totals = totals.filter(total => total.bookId === bookId);
    }
    
    return totals.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Reading Goals Implementation
  async getAllReadingGoals(): Promise<ReadingGoal[]> {
    await this.ensureLoaded();
    return Object.values(this.data.readingGoals).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getReadingGoalById(id: string): Promise<ReadingGoal | null> {
    await this.ensureLoaded();
    return this.data.readingGoals[id] || null;
  }

  async createReadingGoal(goal: InsertReadingGoal): Promise<ReadingGoal> {
    await this.ensureLoaded();
    const newGoal: ReadingGoal = {
      id: randomUUID(),
      ...goal,
      current: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.readingGoals[newGoal.id] = newGoal;
    await this.saveData();
    return newGoal;
  }

  async updateReadingGoal(id: string, updates: UpdateReadingGoal): Promise<ReadingGoal> {
    await this.ensureLoaded();
    const existing = this.data.readingGoals[id];
    if (!existing) {
      throw new Error(`Reading goal with id ${id} not found`);
    }
    
    const updated: ReadingGoal = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.data.readingGoals[id] = updated;
    await this.saveData();
    return updated;
  }

  async deleteReadingGoal(id: string): Promise<void> {
    await this.ensureLoaded();
    if (!this.data.readingGoals[id]) {
      throw new Error(`Reading goal with id ${id} not found`);
    }
    delete this.data.readingGoals[id];
    await this.saveData();
  }
}
