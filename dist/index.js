// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID as randomUUID2 } from "crypto";

// server/storage/FileStorage.ts
import { promises as fs } from "fs";
import { dirname } from "path";
import { randomUUID } from "crypto";
var FileStorage = class {
  dataPath;
  data;
  constructor(dataPath = "./data/store.json") {
    this.dataPath = dataPath;
    this.data = {
      books: {},
      sessions: {},
      notes: {},
      readingStates: {},
      dailyTotals: {},
      dailyBookTotals: {},
      readingGoals: {}
    };
  }
  async ensureDataDir() {
    const dir = dirname(this.dataPath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  async loadData() {
    try {
      await this.ensureDataDir();
      const content = await fs.readFile(this.dataPath, "utf-8");
      this.data = JSON.parse(content);
    } catch (error) {
      this.data = {
        books: {},
        sessions: {},
        notes: {},
        readingStates: {},
        dailyTotals: {},
        dailyBookTotals: {},
        readingGoals: {}
      };
    }
  }
  async saveData() {
    await this.ensureDataDir();
    const content = JSON.stringify(this.data, null, 2);
    const tempPath = this.dataPath + ".tmp";
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, this.dataPath);
  }
  async ensureLoaded() {
    if (Object.keys(this.data.books).length === 0 && Object.keys(this.data.sessions).length === 0) {
      await this.loadData();
    }
  }
  // Book operations
  async getBook(id) {
    await this.ensureLoaded();
    return this.data.books[id];
  }
  async getAllBooks(filters) {
    await this.ensureLoaded();
    let books2 = Object.values(this.data.books);
    if (filters) {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        books2 = books2.filter(
          (book) => book.title.toLowerCase().includes(searchLower) || book.author.toLowerCase().includes(searchLower) || (book.topics || []).some((topic) => topic.toLowerCase().includes(searchLower)) || (book.tags || []).some((tag) => tag.toLowerCase().includes(searchLower))
        );
      }
      if (filters.statuses && filters.statuses.length > 0) {
        books2 = books2.filter((book) => filters.statuses.includes(book.status));
      }
      if (filters.genres && filters.genres.length > 0) {
        books2 = books2.filter((book) => filters.genres.includes(book.genre));
      }
      if (filters.tags && filters.tags.length > 0) {
        books2 = books2.filter(
          (book) => filters.tags.some((tag) => (book.tags || []).includes(tag))
        );
      }
      if (filters.formats && filters.formats.length > 0) {
        books2 = books2.filter((book) => book.format && filters.formats.includes(book.format));
      }
      if (filters.languages && filters.languages.length > 0) {
        books2 = books2.filter((book) => book.language && filters.languages.includes(book.language));
      }
      if (filters.sort) {
        const sortOrder = filters.sortOrder || "desc";
        books2.sort((a, b) => {
          let aVal, bVal;
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
    return books2;
  }
  async getCurrentlyReadingBooks() {
    await this.ensureLoaded();
    return Object.values(this.data.books).filter((book) => book.status === "reading");
  }
  async getBooksByStatus(status) {
    await this.ensureLoaded();
    return Object.values(this.data.books).filter((book) => book.status === status);
  }
  async updateBooksStatus(ids, status) {
    await this.ensureLoaded();
    const updatedBooks = [];
    for (const id of ids) {
      const book = this.data.books[id];
      if (book) {
        const updatedBook = {
          ...book,
          status,
          lastReadAt: status === "reading" ? /* @__PURE__ */ new Date() : book.lastReadAt,
          completedAt: status === "finished" ? /* @__PURE__ */ new Date() : null
        };
        this.data.books[id] = updatedBook;
        updatedBooks.push(updatedBook);
      }
    }
    await this.saveData();
    return updatedBooks;
  }
  async addTagsToBooks(ids, tags) {
    await this.ensureLoaded();
    const updatedBooks = [];
    for (const id of ids) {
      const book = this.data.books[id];
      if (book) {
        const existingTags = book.tags || [];
        const combinedTags = [...existingTags, ...tags];
        const newTags = Array.from(new Set(combinedTags));
        const updatedBook = { ...book, tags: newTags };
        this.data.books[id] = updatedBook;
        updatedBooks.push(updatedBook);
      }
    }
    await this.saveData();
    return updatedBooks;
  }
  async deleteBooks(ids) {
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
  async createBook(insertBook) {
    await this.ensureLoaded();
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const book = {
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
      coverUrl: insertBook.coverUrl || null
    };
    this.data.books[id] = book;
    await this.saveData();
    return book;
  }
  async updateBook(id, updates) {
    await this.ensureLoaded();
    const existingBook = this.data.books[id];
    if (!existingBook) return void 0;
    const updatedBook = { ...existingBook, ...updates };
    this.data.books[id] = updatedBook;
    await this.saveData();
    return updatedBook;
  }
  async deleteBook(id) {
    await this.ensureLoaded();
    const deleted = !!this.data.books[id];
    if (deleted) {
      delete this.data.books[id];
      Object.keys(this.data.sessions).forEach((sessionId) => {
        if (this.data.sessions[sessionId].bookId === id) {
          delete this.data.sessions[sessionId];
        }
      });
      Object.keys(this.data.notes).forEach((noteId) => {
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
  async getSession(id) {
    await this.ensureLoaded();
    return this.data.sessions[id];
  }
  async getSessionsByBook(bookId, filters) {
    await this.ensureLoaded();
    let sessions = Object.values(this.data.sessions).filter((session) => session.bookId === bookId);
    if (filters) {
      if (filters.state) {
        sessions = sessions.filter((session) => session.state === filters.state);
      }
      if (filters.sessionType) {
        sessions = sessions.filter((session) => session.sessionType === filters.sessionType);
      }
      if (filters.dateRange) {
        sessions = sessions.filter(
          (session) => session.sessionDate >= filters.dateRange.start && session.sessionDate <= filters.dateRange.end
        );
      }
      if (filters.limit) {
        sessions = sessions.slice(0, filters.limit);
      }
    }
    return sessions.sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime());
  }
  async getRecentSessions(limit = 10) {
    await this.ensureLoaded();
    const sessions = Object.values(this.data.sessions);
    return sessions.sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime()).slice(0, limit);
  }
  async getActiveSession(bookId) {
    await this.ensureLoaded();
    return Object.values(this.data.sessions).find(
      (session) => session.bookId === bookId && (session.state === "active" || session.state === "paused")
    );
  }
  async getAllActiveSessions() {
    await this.ensureLoaded();
    return Object.values(this.data.sessions).filter(
      (session) => session.state === "active" || session.state === "paused"
    );
  }
  async createSession(insertSession) {
    await this.ensureLoaded();
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const session = {
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
      localId: insertSession.localId || null
    };
    this.data.sessions[id] = session;
    await this.saveData();
    return session;
  }
  async updateSession(id, updates) {
    await this.ensureLoaded();
    const existingSession = this.data.sessions[id];
    if (!existingSession) return void 0;
    const updatedSession = { ...existingSession, ...updates };
    this.data.sessions[id] = updatedSession;
    await this.saveData();
    return updatedSession;
  }
  async deleteSession(id) {
    await this.ensureLoaded();
    const deleted = !!this.data.sessions[id];
    if (deleted) {
      delete this.data.sessions[id];
      await this.saveData();
    }
    return deleted;
  }
  // Session workflow operations
  async startSession(request) {
    await this.ensureLoaded();
    const now = /* @__PURE__ */ new Date();
    const existingActive = await this.getActiveSession(request.bookId);
    if (existingActive) {
      throw new Error("Book already has an active session");
    }
    const book = await this.getBook(request.bookId);
    if (!book) {
      throw new Error("Book not found");
    }
    const readingState = await this.getReadingState(request.bookId);
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
      pomodoroMinutes: request.pomodoroMinutes
    });
    await this.updateBook(request.bookId, {
      status: "reading",
      lastReadAt: now
    });
    await this.updateReadingState(request.bookId, {
      activeSessionId: session.id,
      lastSessionAt: now
    });
    return session;
  }
  async pauseSession(request) {
    await this.ensureLoaded();
    const session = await this.getSession(request.sessionId);
    if (!session || session.state !== "active") {
      return void 0;
    }
    return await this.updateSession(request.sessionId, {
      state: "paused",
      pausedAt: /* @__PURE__ */ new Date()
    });
  }
  async resumeSession(sessionId) {
    await this.ensureLoaded();
    const session = await this.getSession(sessionId);
    if (!session || session.state !== "paused") {
      return void 0;
    }
    return await this.updateSession(sessionId, {
      state: "active",
      resumedAt: /* @__PURE__ */ new Date()
    });
  }
  async stopSession(request) {
    await this.ensureLoaded();
    const session = await this.getSession(request.sessionId);
    if (!session || session.state !== "active" && session.state !== "paused") {
      return void 0;
    }
    const now = /* @__PURE__ */ new Date();
    const startTime = session.startedAt.getTime();
    const pauseTime = session.pausedAt?.getTime() || 0;
    const resumeTime = session.resumedAt?.getTime() || 0;
    let totalDuration = (now.getTime() - startTime) / (1e3 * 60);
    if (pauseTime && resumeTime) {
      totalDuration -= (resumeTime - pauseTime) / (1e3 * 60);
    } else if (pauseTime) {
      totalDuration = (pauseTime - startTime) / (1e3 * 60);
    }
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
      sessionNotes: request.sessionNotes
    });
    if (updatedSession && endPage) {
      await this.updateBookProgress(session.bookId, endPage);
    }
    await this.updateReadingState(session.bookId, {
      activeSessionId: null,
      lastSessionAt: now
    });
    await this.calculateProgress(session.bookId);
    return updatedSession;
  }
  async quickAddPages(request) {
    await this.ensureLoaded();
    const book = await this.getBook(request.bookId);
    if (!book) {
      throw new Error("Book not found");
    }
    const now = /* @__PURE__ */ new Date();
    const currentPage = book.currentPage || 0;
    const newCurrentPage = currentPage + request.pagesRead;
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
      duration: void 0,
      // No timer for quick adds
      sessionNotes: request.sessionNotes
    });
    await this.updateBookProgress(request.bookId, newCurrentPage);
    await this.updateReadingState(request.bookId, {
      lastSessionAt: now
    });
    return session;
  }
  // Notes and quotes operations
  async getNote(id) {
    await this.ensureLoaded();
    return this.data.notes[id];
  }
  async getNotesByBook(bookId) {
    await this.ensureLoaded();
    return Object.values(this.data.notes).filter((note) => note.bookId === bookId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async getNotesBySession(sessionId) {
    await this.ensureLoaded();
    return Object.values(this.data.notes).filter((note) => note.sessionId === sessionId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async createNote(insertNote) {
    await this.ensureLoaded();
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const note = {
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
      ocrConfidence: insertNote.ocrConfidence || null
    };
    this.data.notes[id] = note;
    await this.saveData();
    return note;
  }
  async updateNote(id, updates) {
    await this.ensureLoaded();
    const existingNote = this.data.notes[id];
    if (!existingNote) return void 0;
    const updatedNote = { ...existingNote, ...updates };
    this.data.notes[id] = updatedNote;
    await this.saveData();
    return updatedNote;
  }
  async deleteNote(id) {
    await this.ensureLoaded();
    const deleted = !!this.data.notes[id];
    if (deleted) {
      delete this.data.notes[id];
      await this.saveData();
    }
    return deleted;
  }
  // Reading state and progress operations
  async getReadingState(bookId) {
    await this.ensureLoaded();
    return this.data.readingStates[bookId];
  }
  async updateReadingState(bookId, updates) {
    await this.ensureLoaded();
    const existing = this.data.readingStates[bookId];
    const now = /* @__PURE__ */ new Date();
    const readingState = {
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
      ...updates
    };
    this.data.readingStates[bookId] = readingState;
    await this.saveData();
    return readingState;
  }
  async calculateProgress(bookId) {
    await this.ensureLoaded();
    const sessions = await this.getSessionsByBook(bookId, { limit: 5 });
    const book = await this.getBook(bookId);
    if (!book || sessions.length === 0) {
      return { averagePph: 0, eta: null, dailyTarget: 0 };
    }
    const validSessions = sessions.filter((s) => s.duration && s.pagesRead && s.duration > 0);
    let averagePph = 0;
    if (validSessions.length > 0) {
      const totalPages = validSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
      const totalHours = validSessions.reduce((sum, s) => sum + (s.duration || 0) / 60, 0);
      averagePph = totalHours > 0 ? totalPages / totalHours : 0;
    }
    let eta = null;
    if (book.totalPages && book.currentPage && averagePph > 0) {
      const remainingPages = book.totalPages - book.currentPage;
      const hoursNeeded = remainingPages / averagePph;
      const msNeeded = hoursNeeded * 60 * 60 * 1e3;
      eta = new Date(Date.now() + msNeeded);
    }
    const dailyTarget = Math.max(1, Math.round(averagePph * 0.5));
    await this.updateReadingState(bookId, {
      averagePagesPerHour: averagePph,
      recentSessionsCount: validSessions.length,
      estimatedFinishDate: eta,
      dailyPageTarget: dailyTarget
    });
    return { averagePph, eta, dailyTarget };
  }
  async updateBookProgress(bookId, currentPage, progressPercent) {
    await this.ensureLoaded();
    const book = await this.getBook(bookId);
    if (!book) return void 0;
    const updates = { lastReadAt: /* @__PURE__ */ new Date() };
    if (currentPage !== void 0) {
      updates.currentPage = currentPage;
      if (book.totalPages && book.totalPages > 0) {
        updates.progress = currentPage / book.totalPages;
      }
    }
    if (progressPercent !== void 0) {
      updates.progress = progressPercent;
    }
    if (updates.progress && updates.progress >= 1) {
      updates.status = "finished";
      updates.completedAt = /* @__PURE__ */ new Date();
    }
    return await this.updateBook(bookId, updates);
  }
  // Analytics and forecasting
  async getReadingStats(bookId) {
    await this.ensureLoaded();
    const sessions = await this.getSessionsByBook(bookId);
    const completedSessions = sessions.filter((s) => s.state === "completed");
    const totalSessions = completedSessions.length;
    const totalTimeMinutes = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalPagesRead = completedSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const averagePagesPerHour = totalTimeMinutes > 0 ? totalPagesRead / totalTimeMinutes * 60 : 0;
    const lastSession = sessions.length > 0 ? sessions[0].sessionDate : null;
    return {
      totalSessions,
      totalTimeMinutes,
      totalPagesRead,
      averagePagesPerHour,
      lastSession
    };
  }
  async getDailyReadingStats(date2) {
    await this.ensureLoaded();
    const startOfDay = new Date(date2);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date2);
    endOfDay.setHours(23, 59, 59, 999);
    const dailySessions = Object.values(this.data.sessions).filter(
      (session) => session.sessionDate >= startOfDay && session.sessionDate <= endOfDay && session.state === "completed"
    );
    const sessionsCount = dailySessions.length;
    const totalMinutes = dailySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalPages = dailySessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const booksRead = Array.from(new Set(dailySessions.map((s) => s.bookId)));
    return {
      sessionsCount,
      totalMinutes,
      totalPages,
      booksRead
    };
  }
  // Daily totals operations for high-performance stats
  async upsertDailyTotals(date2, pages, minutes, sessions) {
    await this.ensureLoaded();
    const existing = this.data.dailyTotals[date2];
    if (existing) {
      const updated = {
        ...existing,
        pages: existing.pages + pages,
        minutes: existing.minutes + minutes,
        sessions: existing.sessions + sessions
      };
      this.data.dailyTotals[date2] = updated;
      await this.saveData();
      return updated;
    } else {
      const newTotal = {
        id: Object.keys(this.data.dailyTotals).length + 1,
        // Simple increment for file storage
        date: date2,
        pages,
        minutes,
        sessions
      };
      this.data.dailyTotals[date2] = newTotal;
      await this.saveData();
      return newTotal;
    }
  }
  async upsertDailyBookTotals(date2, bookId, pages, minutes, sessions) {
    await this.ensureLoaded();
    const key = `${date2}:${bookId}`;
    const existing = this.data.dailyBookTotals[key];
    if (existing) {
      const updated = {
        ...existing,
        pages: existing.pages + pages,
        minutes: existing.minutes + minutes,
        sessions: existing.sessions + sessions
      };
      this.data.dailyBookTotals[key] = updated;
      await this.saveData();
      return updated;
    } else {
      const newTotal = {
        id: Object.keys(this.data.dailyBookTotals).length + 1,
        // Simple increment for file storage
        date: date2,
        bookId,
        pages,
        minutes,
        sessions
      };
      this.data.dailyBookTotals[key] = newTotal;
      await this.saveData();
      return newTotal;
    }
  }
  async getDailyTotalsInRange(startDate, endDate) {
    await this.ensureLoaded();
    return Object.values(this.data.dailyTotals).filter(
      (total) => total.date >= startDate && total.date <= endDate
    ).sort((a, b) => a.date.localeCompare(b.date));
  }
  async getDailyBookTotalsInRange(startDate, endDate, bookId) {
    await this.ensureLoaded();
    let totals = Object.values(this.data.dailyBookTotals).filter(
      (total) => total.date >= startDate && total.date <= endDate
    );
    if (bookId) {
      totals = totals.filter((total) => total.bookId === bookId);
    }
    return totals.sort((a, b) => a.date.localeCompare(b.date));
  }
  // Reading Goals Implementation
  async getAllReadingGoals() {
    await this.ensureLoaded();
    return Object.values(this.data.readingGoals).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  async getReadingGoalById(id) {
    await this.ensureLoaded();
    return this.data.readingGoals[id] || null;
  }
  async createReadingGoal(goal) {
    await this.ensureLoaded();
    const newGoal = {
      id: randomUUID(),
      ...goal,
      current: 0,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.data.readingGoals[newGoal.id] = newGoal;
    await this.saveData();
    return newGoal;
  }
  async updateReadingGoal(id, updates) {
    await this.ensureLoaded();
    const existing = this.data.readingGoals[id];
    if (!existing) {
      throw new Error(`Reading goal with id ${id} not found`);
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.data.readingGoals[id] = updated;
    await this.saveData();
    return updated;
  }
  async deleteReadingGoal(id) {
    await this.ensureLoaded();
    if (!this.data.readingGoals[id]) {
      throw new Error(`Reading goal with id ${id} not found`);
    }
    delete this.data.readingGoals[id];
    await this.saveData();
  }
};

// server/storage.ts
var MemStorage = class {
  books;
  sessions;
  notes;
  readingStates;
  dailyTotals;
  dailyBookTotals;
  readingGoals;
  constructor() {
    this.books = /* @__PURE__ */ new Map();
    this.sessions = /* @__PURE__ */ new Map();
    this.notes = /* @__PURE__ */ new Map();
    this.readingStates = /* @__PURE__ */ new Map();
    this.dailyTotals = /* @__PURE__ */ new Map();
    this.dailyBookTotals = /* @__PURE__ */ new Map();
    this.readingGoals = /* @__PURE__ */ new Map();
  }
  async getBook(id) {
    return this.books.get(id);
  }
  async getAllBooks(filters) {
    let books2 = Array.from(this.books.values());
    if (filters) {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        books2 = books2.filter(
          (book) => book.title.toLowerCase().includes(searchLower) || book.author.toLowerCase().includes(searchLower) || (book.topics || []).some((topic) => topic.toLowerCase().includes(searchLower)) || (book.tags || []).some((tag) => tag.toLowerCase().includes(searchLower))
        );
      }
      if (filters.statuses && filters.statuses.length > 0) {
        books2 = books2.filter((book) => filters.statuses.includes(book.status));
      }
      if (filters.genres && filters.genres.length > 0) {
        books2 = books2.filter((book) => filters.genres.includes(book.genre));
      }
      if (filters.tags && filters.tags.length > 0) {
        books2 = books2.filter(
          (book) => filters.tags.some((tag) => (book.tags || []).includes(tag))
        );
      }
      if (filters.formats && filters.formats.length > 0) {
        books2 = books2.filter((book) => book.format && filters.formats.includes(book.format));
      }
      if (filters.languages && filters.languages.length > 0) {
        books2 = books2.filter((book) => book.language && filters.languages.includes(book.language));
      }
      if (filters.sort) {
        const sortOrder = filters.sortOrder || "desc";
        books2.sort((a, b) => {
          let aVal, bVal;
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
    return books2;
  }
  async getCurrentlyReadingBooks() {
    return Array.from(this.books.values()).filter((book) => book.status === "reading");
  }
  async getBooksByStatus(status) {
    return Array.from(this.books.values()).filter((book) => book.status === status);
  }
  async updateBooksStatus(ids, status) {
    const updatedBooks = [];
    for (const id of ids) {
      const book = this.books.get(id);
      if (book) {
        const updatedBook = {
          ...book,
          status,
          lastReadAt: status === "reading" ? /* @__PURE__ */ new Date() : book.lastReadAt,
          completedAt: status === "finished" ? /* @__PURE__ */ new Date() : null
        };
        this.books.set(id, updatedBook);
        updatedBooks.push(updatedBook);
      }
    }
    return updatedBooks;
  }
  async addTagsToBooks(ids, tags) {
    const updatedBooks = [];
    for (const id of ids) {
      const book = this.books.get(id);
      if (book) {
        const existingTags = book.tags || [];
        const combinedTags = [...existingTags, ...tags];
        const newTags = Array.from(new Set(combinedTags));
        const updatedBook = { ...book, tags: newTags };
        this.books.set(id, updatedBook);
        updatedBooks.push(updatedBook);
      }
    }
    return updatedBooks;
  }
  async deleteBooks(ids) {
    let allDeleted = true;
    for (const id of ids) {
      if (!this.books.delete(id)) {
        allDeleted = false;
      }
    }
    return allDeleted;
  }
  async createBook(insertBook) {
    const id = randomUUID2();
    const now = /* @__PURE__ */ new Date();
    const book = {
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
      coverUrl: insertBook.coverUrl || null
    };
    this.books.set(id, book);
    return book;
  }
  async updateBook(id, updates) {
    const existingBook = this.books.get(id);
    if (!existingBook) return void 0;
    const updatedBook = { ...existingBook, ...updates };
    this.books.set(id, updatedBook);
    return updatedBook;
  }
  async deleteBook(id) {
    const deleted = this.books.delete(id);
    if (deleted) {
      Array.from(this.sessions.entries()).forEach(([sessionId, session]) => {
        if (session.bookId === id) {
          this.sessions.delete(sessionId);
        }
      });
      Array.from(this.notes.entries()).forEach(([noteId, note]) => {
        if (note.bookId === id) {
          this.notes.delete(noteId);
        }
      });
      this.readingStates.delete(id);
    }
    return deleted;
  }
  // Reading session operations
  async getSession(id) {
    return this.sessions.get(id);
  }
  async getSessionsByBook(bookId, filters) {
    let sessions = Array.from(this.sessions.values()).filter((session) => session.bookId === bookId);
    if (filters) {
      if (filters.state) {
        sessions = sessions.filter((session) => session.state === filters.state);
      }
      if (filters.sessionType) {
        sessions = sessions.filter((session) => session.sessionType === filters.sessionType);
      }
      if (filters.dateRange) {
        sessions = sessions.filter(
          (session) => session.sessionDate >= filters.dateRange.start && session.sessionDate <= filters.dateRange.end
        );
      }
      if (filters.limit) {
        sessions = sessions.slice(0, filters.limit);
      }
    }
    return sessions.sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime());
  }
  async getRecentSessions(limit = 10) {
    const sessions = Array.from(this.sessions.values());
    return sessions.sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime()).slice(0, limit);
  }
  async getActiveSession(bookId) {
    return Array.from(this.sessions.values()).find(
      (session) => session.bookId === bookId && (session.state === "active" || session.state === "paused")
    );
  }
  async getAllActiveSessions() {
    return Array.from(this.sessions.values()).filter(
      (session) => session.state === "active" || session.state === "paused"
    );
  }
  async createSession(insertSession) {
    const id = randomUUID2();
    const now = /* @__PURE__ */ new Date();
    const session = {
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
      localId: insertSession.localId || null
    };
    this.sessions.set(id, session);
    return session;
  }
  async updateSession(id, updates) {
    const existingSession = this.sessions.get(id);
    if (!existingSession) return void 0;
    const updatedSession = { ...existingSession, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }
  async deleteSession(id) {
    return this.sessions.delete(id);
  }
  // Session workflow operations
  async startSession(request) {
    const now = /* @__PURE__ */ new Date();
    const existingActive = await this.getActiveSession(request.bookId);
    if (existingActive) {
      throw new Error("Book already has an active session");
    }
    const book = await this.getBook(request.bookId);
    if (!book) {
      throw new Error("Book not found");
    }
    const readingState = await this.getReadingState(request.bookId);
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
      pomodoroMinutes: request.pomodoroMinutes
    });
    await this.updateBook(request.bookId, {
      status: "reading",
      lastReadAt: now
    });
    await this.updateReadingState(request.bookId, {
      activeSessionId: session.id,
      lastSessionAt: now
    });
    return session;
  }
  async pauseSession(request) {
    const session = await this.getSession(request.sessionId);
    if (!session || session.state !== "active") {
      return void 0;
    }
    return await this.updateSession(request.sessionId, {
      state: "paused",
      pausedAt: /* @__PURE__ */ new Date()
    });
  }
  async resumeSession(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session || session.state !== "paused") {
      return void 0;
    }
    return await this.updateSession(sessionId, {
      state: "active",
      resumedAt: /* @__PURE__ */ new Date()
    });
  }
  async stopSession(request) {
    const session = await this.getSession(request.sessionId);
    if (!session || session.state !== "active" && session.state !== "paused") {
      return void 0;
    }
    const now = /* @__PURE__ */ new Date();
    const startTime = session.startedAt.getTime();
    const pauseTime = session.pausedAt?.getTime() || 0;
    const resumeTime = session.resumedAt?.getTime() || 0;
    let totalDuration = (now.getTime() - startTime) / (1e3 * 60);
    if (pauseTime && resumeTime) {
      totalDuration -= (resumeTime - pauseTime) / (1e3 * 60);
    } else if (pauseTime) {
      totalDuration = (pauseTime - startTime) / (1e3 * 60);
    }
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
      sessionNotes: request.sessionNotes
    });
    if (updatedSession && endPage) {
      await this.updateBookProgress(session.bookId, endPage);
    }
    await this.updateReadingState(session.bookId, {
      activeSessionId: null,
      lastSessionAt: now
    });
    await this.calculateProgress(session.bookId);
    return updatedSession;
  }
  async quickAddPages(request) {
    const book = await this.getBook(request.bookId);
    if (!book) {
      throw new Error("Book not found");
    }
    const now = /* @__PURE__ */ new Date();
    const currentPage = book.currentPage || 0;
    const newCurrentPage = currentPage + request.pagesRead;
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
      duration: void 0,
      // No timer for quick adds
      sessionNotes: request.sessionNotes
    });
    await this.updateBookProgress(request.bookId, newCurrentPage);
    await this.updateReadingState(request.bookId, {
      lastSessionAt: now
    });
    return session;
  }
  // Notes and quotes operations
  async getNote(id) {
    return this.notes.get(id);
  }
  async getNotesByBook(bookId) {
    return Array.from(this.notes.values()).filter((note) => note.bookId === bookId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async getNotesBySession(sessionId) {
    return Array.from(this.notes.values()).filter((note) => note.sessionId === sessionId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async createNote(insertNote) {
    const id = randomUUID2();
    const now = /* @__PURE__ */ new Date();
    const note = {
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
      ocrConfidence: insertNote.ocrConfidence || null
    };
    this.notes.set(id, note);
    return note;
  }
  async updateNote(id, updates) {
    const existingNote = this.notes.get(id);
    if (!existingNote) return void 0;
    const updatedNote = { ...existingNote, ...updates };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }
  async deleteNote(id) {
    return this.notes.delete(id);
  }
  // Reading state and progress operations
  async getReadingState(bookId) {
    return this.readingStates.get(bookId);
  }
  async updateReadingState(bookId, updates) {
    const existing = this.readingStates.get(bookId);
    const now = /* @__PURE__ */ new Date();
    const readingState = {
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
      ...updates
    };
    this.readingStates.set(bookId, readingState);
    return readingState;
  }
  async calculateProgress(bookId) {
    const sessions = await this.getSessionsByBook(bookId, { limit: 5 });
    const book = await this.getBook(bookId);
    if (!book || sessions.length === 0) {
      return { averagePph: 0, eta: null, dailyTarget: 0 };
    }
    const validSessions = sessions.filter((s) => s.duration && s.pagesRead && s.duration > 0);
    let averagePph = 0;
    if (validSessions.length > 0) {
      const totalPages = validSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
      const totalHours = validSessions.reduce((sum, s) => sum + (s.duration || 0) / 60, 0);
      averagePph = totalHours > 0 ? totalPages / totalHours : 0;
    }
    let eta = null;
    if (book.totalPages && book.currentPage && averagePph > 0) {
      const remainingPages = book.totalPages - book.currentPage;
      const hoursNeeded = remainingPages / averagePph;
      const msNeeded = hoursNeeded * 60 * 60 * 1e3;
      eta = new Date(Date.now() + msNeeded);
    }
    const dailyTarget = Math.max(1, Math.round(averagePph * 0.5));
    await this.updateReadingState(bookId, {
      averagePagesPerHour: averagePph,
      recentSessionsCount: validSessions.length,
      estimatedFinishDate: eta,
      dailyPageTarget: dailyTarget
    });
    return { averagePph, eta, dailyTarget };
  }
  async updateBookProgress(bookId, currentPage, progressPercent) {
    const book = await this.getBook(bookId);
    if (!book) return void 0;
    const updates = { lastReadAt: /* @__PURE__ */ new Date() };
    if (currentPage !== void 0) {
      updates.currentPage = currentPage;
      if (book.totalPages && book.totalPages > 0) {
        updates.progress = currentPage / book.totalPages;
      }
    }
    if (progressPercent !== void 0) {
      updates.progress = progressPercent;
    }
    if (updates.progress && updates.progress >= 1) {
      updates.status = "finished";
      updates.completedAt = /* @__PURE__ */ new Date();
    }
    return await this.updateBook(bookId, updates);
  }
  // Analytics and forecasting
  async getReadingStats(bookId) {
    const sessions = await this.getSessionsByBook(bookId);
    const completedSessions = sessions.filter((s) => s.state === "completed");
    const totalSessions = completedSessions.length;
    const totalTimeMinutes = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalPagesRead = completedSessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const averagePagesPerHour = totalTimeMinutes > 0 ? totalPagesRead / totalTimeMinutes * 60 : 0;
    const lastSession = sessions.length > 0 ? sessions[0].sessionDate : null;
    return {
      totalSessions,
      totalTimeMinutes,
      totalPagesRead,
      averagePagesPerHour,
      lastSession
    };
  }
  async getDailyReadingStats(date2) {
    const startOfDay = new Date(date2);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date2);
    endOfDay.setHours(23, 59, 59, 999);
    const dailySessions = Array.from(this.sessions.values()).filter(
      (session) => session.sessionDate >= startOfDay && session.sessionDate <= endOfDay && session.state === "completed"
    );
    const sessionsCount = dailySessions.length;
    const totalMinutes = dailySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalPages = dailySessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const booksRead = Array.from(new Set(dailySessions.map((s) => s.bookId)));
    return {
      sessionsCount,
      totalMinutes,
      totalPages,
      booksRead
    };
  }
  // Daily totals operations for high-performance stats
  async upsertDailyTotals(date2, pages, minutes, sessions) {
    const existing = this.dailyTotals.get(date2);
    if (existing) {
      const updated = {
        ...existing,
        pages: existing.pages + pages,
        minutes: existing.minutes + minutes,
        sessions: existing.sessions + sessions
      };
      this.dailyTotals.set(date2, updated);
      return updated;
    } else {
      const newTotal = {
        id: this.dailyTotals.size + 1,
        // Simple increment for memory storage
        date: date2,
        pages,
        minutes,
        sessions
      };
      this.dailyTotals.set(date2, newTotal);
      return newTotal;
    }
  }
  async upsertDailyBookTotals(date2, bookId, pages, minutes, sessions) {
    const key = `${date2}:${bookId}`;
    const existing = this.dailyBookTotals.get(key);
    if (existing) {
      const updated = {
        ...existing,
        pages: existing.pages + pages,
        minutes: existing.minutes + minutes,
        sessions: existing.sessions + sessions
      };
      this.dailyBookTotals.set(key, updated);
      return updated;
    } else {
      const newTotal = {
        id: this.dailyBookTotals.size + 1,
        // Simple increment for memory storage
        date: date2,
        bookId,
        pages,
        minutes,
        sessions
      };
      this.dailyBookTotals.set(key, newTotal);
      return newTotal;
    }
  }
  async getDailyTotalsInRange(startDate, endDate) {
    return Array.from(this.dailyTotals.values()).filter(
      (total) => total.date >= startDate && total.date <= endDate
    ).sort((a, b) => a.date.localeCompare(b.date));
  }
  async getDailyBookTotalsInRange(startDate, endDate, bookId) {
    let totals = Array.from(this.dailyBookTotals.values()).filter(
      (total) => total.date >= startDate && total.date <= endDate
    );
    if (bookId) {
      totals = totals.filter((total) => total.bookId === bookId);
    }
    return totals.sort((a, b) => a.date.localeCompare(b.date));
  }
  // Reading Goals Implementation
  async getAllReadingGoals() {
    return Array.from(this.readingGoals.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  async getReadingGoalById(id) {
    return this.readingGoals.get(id) || null;
  }
  async createReadingGoal(goal) {
    const newGoal = {
      id: randomUUID2(),
      ...goal,
      current: 0,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.readingGoals.set(newGoal.id, newGoal);
    return newGoal;
  }
  async updateReadingGoal(id, updates) {
    const existing = this.readingGoals.get(id);
    if (!existing) {
      throw new Error(`Reading goal with id ${id} not found`);
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.readingGoals.set(id, updated);
    return updated;
  }
  async deleteReadingGoal(id) {
    if (!this.readingGoals.has(id)) {
      throw new Error(`Reading goal with id ${id} not found`);
    }
    this.readingGoals.delete(id);
  }
};
var storage = process.env.LOCAL_PERSIST === "1" ? new FileStorage() : new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, serial, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  author: text("author").notNull(),
  genre: text("genre").notNull(),
  topics: text("topics").array().default([]),
  usefulness: text("usefulness"),
  // How the book might be useful
  totalPages: integer("total_pages"),
  isCurrentlyReading: boolean("is_currently_reading").default(false),
  currentPage: integer("current_page").default(0),
  notes: text("notes").array().default([]),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  // New fields for enhanced library management
  status: text("status").notNull().default("toRead"),
  // 'toRead'|'reading'|'onHold'|'dnf'|'finished'
  priority: integer("priority").default(3),
  // 1-5 scale
  tags: text("tags").array().default([]),
  format: text("format").default("paper"),
  // 'paper'|'ebook'|'audio'
  language: text("language").default("English"),
  addedAt: timestamp("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastReadAt: timestamp("last_read_at"),
  progress: real("progress").default(0),
  // 0-1 decimal for percentage
  coverUrl: text("cover_url")
});
var readingSessions = pgTable("reading_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id").notNull().references(() => books.id),
  // Session timing
  startedAt: timestamp("started_at").notNull(),
  pausedAt: timestamp("paused_at"),
  resumedAt: timestamp("resumed_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
  // Total reading time in minutes
  // Progress tracking
  startPage: integer("start_page"),
  endPage: integer("end_page"),
  pagesRead: integer("pages_read").default(0),
  progressPercent: real("progress_percent"),
  // For ebooks/audio
  // Session state and metadata
  state: text("state").notNull().default("completed"),
  // 'active'|'paused'|'completed'
  sessionType: text("session_type").default("timed"),
  // 'timed'|'quick'
  pomodoroMinutes: integer("pomodoro_minutes"),
  // Optional Pomodoro duration
  // Context
  sessionDate: timestamp("session_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  timeZone: text("time_zone").default("UTC"),
  deviceType: text("device_type"),
  // For offline sync context
  // Quick notes during session
  sessionNotes: text("session_notes"),
  // Sync status for offline support
  syncStatus: text("sync_status").default("synced"),
  // 'pending'|'syncing'|'synced'|'failed'
  localId: text("local_id")
  // For offline session management
});
var readingGoals = pgTable("reading_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  // 'books'|'pages'|'minutes'
  target: integer("target").notNull(),
  current: integer("current").default(0),
  period: text("period").notNull(),
  // 'daily'|'weekly'|'monthly'|'yearly'
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var bookNotes = pgTable("book_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id").notNull().references(() => books.id),
  sessionId: varchar("session_id").references(() => readingSessions.id),
  // Content
  content: text("content").notNull(),
  noteType: text("note_type").notNull().default("note"),
  // 'note'|'quote'|'highlight'
  // Location context
  page: integer("page"),
  chapter: text("chapter"),
  position: text("position"),
  // For ebooks: chapter.paragraph.sentence
  // Metadata
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  tags: text("tags").array().default([]),
  isPrivate: boolean("is_private").default(false),
  // OCR/source tracking (for future camera quotes)
  sourceImage: text("source_image_url"),
  ocrConfidence: real("ocr_confidence")
});
var bookReadingState = pgTable("book_reading_state", {
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
  reminderSettings: text("reminder_settings")
  // JSON for time + bite preferences
});
var dailyTotals = pgTable("daily_totals", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  pages: integer("pages").notNull().default(0),
  minutes: integer("minutes").notNull().default(0),
  sessions: integer("sessions").notNull().default(0)
});
var dailyBookTotals = pgTable("daily_book_totals", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  bookId: varchar("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  pages: integer("pages").notNull().default(0),
  minutes: integer("minutes").notNull().default(0),
  sessions: integer("sessions").notNull().default(0)
});
var BOOK_GENRES = [
  "Fiction",
  "Personal Development",
  "Business / Finance",
  "Philosophy / Spirituality",
  "Psychology / Self-Improvement",
  "History / Culture",
  "Science / Technology",
  "General Non-Fiction",
  "Biography/Memoir"
];
var BOOK_STATUSES = [
  "toRead",
  "reading",
  "onHold",
  "dnf",
  "finished"
];
var BOOK_FORMATS = [
  "paper",
  "ebook",
  "audio"
];
var SESSION_STATES = [
  "active",
  "paused",
  "completed"
];
var SESSION_TYPES = [
  "timed",
  "quick"
];
var NOTE_TYPES = [
  "note",
  "quote",
  "highlight",
  "summary",
  "action"
];
var SYNC_STATUSES = [
  "pending",
  "syncing",
  "synced",
  "failed"
];
var genreEnum = z.enum(BOOK_GENRES);
var statusEnum = z.enum(BOOK_STATUSES);
var formatEnum = z.enum(BOOK_FORMATS);
var sessionStateEnum = z.enum(SESSION_STATES);
var sessionTypeEnum = z.enum(SESSION_TYPES);
var noteTypeEnum = z.enum(NOTE_TYPES);
var syncStatusEnum = z.enum(SYNC_STATUSES);
var insertBookSchema = createInsertSchema(books).omit({
  id: true,
  addedAt: true
  // Auto-generated
}).extend({
  genre: genreEnum,
  status: statusEnum.default("toRead"),
  format: formatEnum.default("paper"),
  priority: z.number().int().min(1).max(5).default(3),
  progress: z.number().min(0).max(1).default(0),
  language: z.string().default("English"),
  topics: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(15).default([])
});
var updateBookSchema = insertBookSchema.partial().extend({
  lastReadAt: z.union([z.date(), z.string().datetime()]).optional().transform((val) => {
    if (typeof val === "string") return new Date(val);
    return val;
  })
});
var insertReadingSessionSchema = createInsertSchema(readingSessions).omit({
  id: true,
  sessionDate: true
  // Auto-generated
}).extend({
  state: sessionStateEnum.default("completed"),
  sessionType: sessionTypeEnum.default("timed"),
  syncStatus: syncStatusEnum.default("synced"),
  duration: z.number().int().min(0).optional(),
  pagesRead: z.number().int().min(0).default(0),
  progressPercent: z.number().min(0).max(1).optional(),
  pomodoroMinutes: z.number().int().min(5).max(120).optional()
});
var updateReadingSessionSchema = insertReadingSessionSchema.partial();
var insertBookNoteSchema = createInsertSchema(bookNotes).omit({
  id: true,
  createdAt: true
  // Auto-generated
}).extend({
  noteType: noteTypeEnum.default("note"),
  content: z.string().min(1).max(5e3),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  page: z.number().int().min(1).optional(),
  ocrConfidence: z.number().min(0).max(1).optional()
});
var updateBookNoteSchema = insertBookNoteSchema.partial();
var insertBookReadingStateSchema = createInsertSchema(bookReadingState).omit({
  lastCalculatedAt: true
  // Auto-updated
}).extend({
  averagePagesPerHour: z.number().min(0).optional(),
  recentSessionsCount: z.number().int().min(0).default(0),
  dailyPageTarget: z.number().int().min(1).optional()
});
var updateBookReadingStateSchema = insertBookReadingStateSchema.partial();
var insertDailyTotalsSchema = createInsertSchema(dailyTotals).omit({
  id: true
});
var insertDailyBookTotalsSchema = createInsertSchema(dailyBookTotals).omit({
  id: true
});
var startSessionSchema = z.object({
  bookId: z.string().uuid(),
  startPage: z.number().int().min(0).optional(),
  pomodoroMinutes: z.number().int().min(5).max(120).optional()
});
var pauseSessionSchema = z.object({
  sessionId: z.string().uuid()
});
var stopSessionSchema = z.object({
  sessionId: z.string().uuid(),
  endPage: z.number().int().min(0).optional(),
  sessionNotes: z.string().max(1e3).optional()
});
var quickAddPagesSchema = z.object({
  bookId: z.string().uuid(),
  pagesRead: z.number().int().min(1).max(100),
  sessionNotes: z.string().max(500).optional()
});
var insertReadingGoalSchema = createInsertSchema(readingGoals).omit({ id: true, current: true, createdAt: true, updatedAt: true });
var updateReadingGoalSchema = createInsertSchema(readingGoals).omit({ id: true, createdAt: true, updatedAt: true }).partial();

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/books/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      const query = encodeURIComponent(q);
      const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=20&orderBy=relevance`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }
      const data = await response.json();
      const books2 = (data.items || []).map((item) => {
        const volumeInfo = item.volumeInfo || {};
        return {
          googleId: item.id,
          title: volumeInfo.title || "Unknown Title",
          authors: volumeInfo.authors || ["Unknown Author"],
          description: volumeInfo.description || "",
          publishedDate: volumeInfo.publishedDate || "",
          pageCount: volumeInfo.pageCount || 0,
          categories: volumeInfo.categories || [],
          thumbnail: volumeInfo.imageLinks?.thumbnail || "",
          isbn: volumeInfo.industryIdentifiers?.[0]?.identifier || "",
          publisher: volumeInfo.publisher || "",
          language: volumeInfo.language || "en",
          averageRating: volumeInfo.averageRating || 0,
          ratingsCount: volumeInfo.ratingsCount || 0
        };
      });
      res.json({ books: books2, total: books2.length });
    } catch (error) {
      console.error("External book search error:", error);
      res.status(500).json({ error: "Failed to search books" });
    }
  });
  app2.post("/api/books/add-from-search", async (req, res) => {
    try {
      const { searchResult, format = "Physical", status = "To-Read", priority = "Medium" } = req.body;
      if (!searchResult) {
        return res.status(400).json({ error: "Search result data is required" });
      }
      const mapGenre = (category) => {
        if (!category) return "General Non-Fiction";
        const lowerCategory = category.toLowerCase();
        if (lowerCategory.includes("fiction") && !lowerCategory.includes("non-fiction")) return "Fiction";
        if (lowerCategory.includes("business") || lowerCategory.includes("finance") || lowerCategory.includes("economics")) return "Business / Finance";
        if (lowerCategory.includes("self-help") || lowerCategory.includes("personal development") || lowerCategory.includes("self help")) return "Personal Development";
        if (lowerCategory.includes("philosophy") || lowerCategory.includes("spirituality") || lowerCategory.includes("religion")) return "Philosophy / Spirituality";
        if (lowerCategory.includes("psychology") || lowerCategory.includes("self-improvement") || lowerCategory.includes("personal growth")) return "Psychology / Self-Improvement";
        if (lowerCategory.includes("history") || lowerCategory.includes("culture") || lowerCategory.includes("historical")) return "History / Culture";
        if (lowerCategory.includes("science") || lowerCategory.includes("technology") || lowerCategory.includes("technical") || lowerCategory.includes("computer")) return "Science / Technology";
        if (lowerCategory.includes("biography") || lowerCategory.includes("memoir") || lowerCategory.includes("autobiography")) return "Biography/Memoir";
        return "General Non-Fiction";
      };
      const bookData = {
        title: searchResult.title,
        author: searchResult.authors.join(", "),
        genre: mapGenre(searchResult.categories[0]),
        totalPages: searchResult.pageCount || null,
        currentPage: 0,
        status,
        priority,
        format,
        coverImage: searchResult.thumbnail || null,
        description: searchResult.description || null,
        isbn: searchResult.isbn || null,
        publisher: searchResult.publisher || null,
        publishedDate: searchResult.publishedDate || null,
        rating: null,
        usefulness: null,
        tags: [],
        topics: []
      };
      const validatedData = insertBookSchema.parse(bookData);
      const book = await storage.createBook(validatedData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid book data", details: error.errors });
      }
      console.error("Error adding book from search:", error);
      res.status(500).json({ error: "Failed to add book" });
    }
  });
  const parseMultiValue = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.flatMap((v) => String(v).split(",").map((s) => s.trim()).filter(Boolean));
    }
    return String(value).split(",").map((s) => s.trim()).filter(Boolean);
  };
  app2.get("/api/books", async (req, res) => {
    try {
      const filters = {};
      if (req.query.search) filters.search = req.query.search;
      if (req.query.statuses) filters.statuses = parseMultiValue(req.query.statuses);
      if (req.query.genres) filters.genres = parseMultiValue(req.query.genres);
      if (req.query.tags) filters.tags = parseMultiValue(req.query.tags);
      if (req.query.formats) filters.formats = parseMultiValue(req.query.formats);
      if (req.query.languages) filters.languages = parseMultiValue(req.query.languages);
      if (req.query.sort) filters.sort = req.query.sort;
      if (req.query.sortOrder) filters.sortOrder = req.query.sortOrder;
      const books2 = await storage.getAllBooks(filters);
      res.json(books2);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });
  app2.get("/api/books/currently-reading", async (req, res) => {
    try {
      const books2 = await storage.getCurrentlyReadingBooks();
      res.json(books2);
    } catch (error) {
      console.error("Error fetching currently reading books:", error);
      res.status(500).json({ error: "Failed to fetch currently reading books" });
    }
  });
  app2.get("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      console.error("Error fetching book:", error);
      res.status(500).json({ error: "Failed to fetch book" });
    }
  });
  app2.post("/api/books", async (req, res) => {
    try {
      const validatedData = insertBookSchema.parse(req.body);
      const book = await storage.createBook(validatedData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid book data", details: error.errors });
      }
      console.error("Error creating book:", error);
      res.status(500).json({ error: "Failed to create book" });
    }
  });
  app2.patch("/api/books/:id", async (req, res) => {
    try {
      const validatedData = updateBookSchema.parse(req.body);
      const book = await storage.updateBook(req.params.id, validatedData);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating book:", error);
      res.status(500).json({ error: "Failed to update book" });
    }
  });
  app2.delete("/api/books/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBook(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ error: "Failed to delete book" });
    }
  });
  app2.post("/api/books/bulk/status", async (req, res) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || !status) {
        return res.status(400).json({ error: "Invalid request: ids array and status required" });
      }
      const validStatus = statusEnum.parse(status);
      const updatedBooks = await storage.updateBooksStatus(ids, validStatus);
      res.json(updatedBooks);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid status", details: error.errors });
      }
      console.error("Error updating book statuses:", error);
      res.status(500).json({ error: "Failed to update book statuses" });
    }
  });
  app2.post("/api/books/bulk/tags", async (req, res) => {
    try {
      const { ids, tags } = req.body;
      if (!Array.isArray(ids) || !Array.isArray(tags)) {
        return res.status(400).json({ error: "Invalid request: ids and tags arrays required" });
      }
      const updatedBooks = await storage.addTagsToBooks(ids, tags);
      res.json(updatedBooks);
    } catch (error) {
      console.error("Error adding tags to books:", error);
      res.status(500).json({ error: "Failed to add tags to books" });
    }
  });
  app2.delete("/api/books/bulk", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ error: "Invalid request: ids array required" });
      }
      const deleted = await storage.deleteBooks(ids);
      if (!deleted) {
        return res.status(404).json({ error: "Some books not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting books:", error);
      res.status(500).json({ error: "Failed to delete books" });
    }
  });
  app2.get("/api/books/status/:status", async (req, res) => {
    try {
      const status = req.params.status;
      const books2 = await storage.getBooksByStatus(status);
      res.json(books2);
    } catch (error) {
      console.error("Error fetching books by status:", error);
      res.status(500).json({ error: "Failed to fetch books by status" });
    }
  });
  app2.post("/api/sessions/start", async (req, res) => {
    try {
      const validatedData = startSessionSchema.parse(req.body);
      const session = await storage.startSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      if (error instanceof Error && error.message.includes("already has an active session")) {
        return res.status(409).json({ error: error.message });
      }
      console.error("Error starting session:", error);
      res.status(500).json({ error: "Failed to start session" });
    }
  });
  app2.post("/api/sessions/:id/pause", async (req, res) => {
    try {
      const validatedData = pauseSessionSchema.parse({ sessionId: req.params.id, ...req.body });
      const session = await storage.pauseSession(validatedData);
      if (!session) {
        return res.status(404).json({ error: "Session not found or not active" });
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid pause data", details: error.errors });
      }
      console.error("Error pausing session:", error);
      res.status(500).json({ error: "Failed to pause session" });
    }
  });
  app2.post("/api/sessions/:id/resume", async (req, res) => {
    try {
      const session = await storage.resumeSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found or not paused" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error resuming session:", error);
      res.status(500).json({ error: "Failed to resume session" });
    }
  });
  app2.post("/api/sessions/:id/stop", async (req, res) => {
    try {
      const validatedData = stopSessionSchema.parse({ sessionId: req.params.id, ...req.body });
      const session = await storage.stopSession(validatedData);
      if (!session) {
        return res.status(404).json({ error: "Session not found or not active/paused" });
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid stop data", details: error.errors });
      }
      console.error("Error stopping session:", error);
      res.status(500).json({ error: "Failed to stop session" });
    }
  });
  app2.post("/api/sessions/quick-add", async (req, res) => {
    try {
      const validatedData = quickAddPagesSchema.parse(req.body);
      const session = await storage.quickAddPages(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid quick add data", details: error.errors });
      }
      console.error("Error quick adding pages:", error);
      res.status(500).json({ error: "Failed to quick add pages" });
    }
  });
  app2.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });
  app2.get("/api/books/:bookId/sessions", async (req, res) => {
    try {
      const filters = {};
      if (req.query.state) filters.state = req.query.state;
      if (req.query.sessionType) filters.sessionType = req.query.sessionType;
      if (req.query.limit) filters.limit = parseInt(req.query.limit);
      if (req.query.startDate && req.query.endDate) {
        filters.dateRange = {
          start: new Date(req.query.startDate),
          end: new Date(req.query.endDate)
        };
      }
      const sessions = await storage.getSessionsByBook(req.params.bookId, filters);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching book sessions:", error);
      res.status(500).json({ error: "Failed to fetch book sessions" });
    }
  });
  app2.get("/api/sessions/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      const sessions = await storage.getRecentSessions(limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching recent sessions:", error);
      res.status(500).json({ error: "Failed to fetch recent sessions" });
    }
  });
  app2.get("/api/books/:bookId/active-session", async (req, res) => {
    try {
      const session = await storage.getActiveSession(req.params.bookId);
      res.json(session);
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ error: "Failed to fetch active session" });
    }
  });
  app2.get("/api/sessions/active", async (req, res) => {
    try {
      const sessions = await storage.getAllActiveSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });
  app2.patch("/api/sessions/:id", async (req, res) => {
    try {
      const validatedData = updateReadingSessionSchema.parse(req.body);
      const session = await storage.updateSession(req.params.id, validatedData);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid session update data", details: error.errors });
      }
      console.error("Error updating session:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });
  app2.delete("/api/sessions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSession(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });
  app2.get("/api/notes/:id", async (req, res) => {
    try {
      const note = await storage.getNote(req.params.id);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      console.error("Error fetching note:", error);
      res.status(500).json({ error: "Failed to fetch note" });
    }
  });
  app2.get("/api/books/:bookId/notes", async (req, res) => {
    try {
      const notes = await storage.getNotesByBook(req.params.bookId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching book notes:", error);
      res.status(500).json({ error: "Failed to fetch book notes" });
    }
  });
  app2.get("/api/sessions/:sessionId/notes", async (req, res) => {
    try {
      const notes = await storage.getNotesBySession(req.params.sessionId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching session notes:", error);
      res.status(500).json({ error: "Failed to fetch session notes" });
    }
  });
  app2.post("/api/notes", async (req, res) => {
    try {
      const validatedData = insertBookNoteSchema.parse(req.body);
      const note = await storage.createNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid note data", details: error.errors });
      }
      console.error("Error creating note:", error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });
  app2.patch("/api/notes/:id", async (req, res) => {
    try {
      const validatedData = updateBookNoteSchema.parse(req.body);
      const note = await storage.updateNote(req.params.id, validatedData);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid note update data", details: error.errors });
      }
      console.error("Error updating note:", error);
      res.status(500).json({ error: "Failed to update note" });
    }
  });
  app2.delete("/api/notes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNote(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });
  app2.get("/api/books/:bookId/reading-state", async (req, res) => {
    try {
      const readingState = await storage.getReadingState(req.params.bookId);
      res.json(readingState);
    } catch (error) {
      console.error("Error fetching reading state:", error);
      res.status(500).json({ error: "Failed to fetch reading state" });
    }
  });
  app2.patch("/api/books/:bookId/reading-state", async (req, res) => {
    try {
      const validatedData = updateBookReadingStateSchema.parse(req.body);
      const readingState = await storage.updateReadingState(req.params.bookId, validatedData);
      res.json(readingState);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid reading state data", details: error.errors });
      }
      console.error("Error updating reading state:", error);
      res.status(500).json({ error: "Failed to update reading state" });
    }
  });
  app2.post("/api/books/:bookId/calculate-progress", async (req, res) => {
    try {
      const forecast = await storage.calculateProgress(req.params.bookId);
      res.json(forecast);
    } catch (error) {
      console.error("Error calculating progress:", error);
      res.status(500).json({ error: "Failed to calculate progress" });
    }
  });
  app2.patch("/api/books/:bookId/progress", async (req, res) => {
    try {
      const { currentPage, progressPercent } = req.body;
      if (currentPage === void 0 && progressPercent === void 0) {
        return res.status(400).json({ error: "Either currentPage or progressPercent must be provided" });
      }
      const book = await storage.updateBookProgress(req.params.bookId, currentPage, progressPercent);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      console.error("Error updating book progress:", error);
      res.status(500).json({ error: "Failed to update book progress" });
    }
  });
  app2.get("/api/books/:bookId/stats", async (req, res) => {
    try {
      const stats = await storage.getReadingStats(req.params.bookId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching reading stats:", error);
      res.status(500).json({ error: "Failed to fetch reading stats" });
    }
  });
  app2.get("/api/stats/daily", async (req, res) => {
    try {
      const dateParam = req.query.date;
      const date2 = dateParam ? new Date(dateParam) : /* @__PURE__ */ new Date();
      if (isNaN(date2.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      const stats = await storage.getDailyReadingStats(date2);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ error: "Failed to fetch daily stats" });
    }
  });
  app2.get("/api/stats/overview", async (req, res) => {
    try {
      const fromParam = req.query.from;
      const toParam = req.query.to;
      const formatDateString = (date2) => {
        const year = date2.getFullYear();
        const month = String(date2.getMonth() + 1).padStart(2, "0");
        const day = String(date2.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      const parseAndValidateDate = (dateStr) => {
        if (!dateStr) return null;
        const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (!match) return null;
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        const date2 = new Date(year, month, day);
        if (date2.getFullYear() !== year || date2.getMonth() !== month || date2.getDate() !== day) {
          return null;
        }
        return date2;
      };
      const generateDateRange = (start, end) => {
        const dates = [];
        const startDate = parseAndValidateDate(start);
        const endDate = parseAndValidateDate(end);
        if (!startDate || !endDate) return [];
        const current = new Date(startDate);
        while (current <= endDate) {
          dates.push(formatDateString(current));
          current.setDate(current.getDate() + 1);
        }
        return dates;
      };
      const today = /* @__PURE__ */ new Date();
      const defaultFrom = new Date(today);
      defaultFrom.setDate(today.getDate() - 30);
      const fromDate = fromParam ? parseAndValidateDate(fromParam) ? formatDateString(parseAndValidateDate(fromParam)) : null : formatDateString(defaultFrom);
      const toDate = toParam ? parseAndValidateDate(toParam) ? formatDateString(parseAndValidateDate(toParam)) : null : formatDateString(today);
      if (!fromDate || !toDate) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }
      const todayStr = formatDateString(today);
      const clampedToDate = toDate > todayStr ? todayStr : toDate;
      if (fromDate > clampedToDate) {
        return res.status(400).json({ error: "From date must be before or equal to to date." });
      }
      const clampedToDateObj = parseAndValidateDate(clampedToDate);
      const extendedStartDate = new Date(clampedToDateObj);
      extendedStartDate.setDate(clampedToDateObj.getDate() - 365);
      const extendedFrom = formatDateString(extendedStartDate);
      const [dailyTotalsData, extendedDailyTotalsData, allBooks, activeBooks] = await Promise.all([
        storage.getDailyTotalsInRange(fromDate, clampedToDate),
        storage.getDailyTotalsInRange(extendedFrom, clampedToDate),
        storage.getAllBooks(),
        storage.getCurrentlyReadingBooks()
      ]);
      const allDatesInRange = generateDateRange(fromDate, clampedToDate);
      const dailyTotalsMap = new Map(dailyTotalsData.map((day) => [day.date, day]));
      const extendedDailyTotalsMap = new Map(extendedDailyTotalsData.map((day) => [day.date, day]));
      const fullDailyTotals = allDatesInRange.map(
        (date2) => dailyTotalsMap.get(date2) || {
          id: 0,
          date: date2,
          pages: 0,
          minutes: 0,
          sessions: 0
        }
      );
      const totals = {
        pages: fullDailyTotals.reduce((sum, day) => sum + day.pages, 0),
        minutes: fullDailyTotals.reduce((sum, day) => sum + day.minutes, 0),
        sessions: fullDailyTotals.reduce((sum, day) => sum + day.sessions, 0)
      };
      const calculateStreaks = () => {
        const extendedDates = generateDateRange(extendedFrom, clampedToDate);
        const extendedDailyTotals = extendedDates.map((date2) => {
          const existingDay = extendedDailyTotalsMap.get(date2);
          return existingDay || { id: 0, date: date2, pages: 0, minutes: 0, sessions: 0 };
        });
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;
        for (let i = extendedDailyTotals.length - 1; i >= 0; i--) {
          const day = extendedDailyTotals[i];
          const isReadDay = day.pages >= 1 || day.minutes >= 5;
          if (isReadDay) {
            currentStreak++;
          } else {
            break;
          }
        }
        for (const day of fullDailyTotals) {
          const isReadDay = day.pages >= 1 || day.minutes >= 5;
          if (isReadDay) {
            tempStreak++;
            bestStreak = Math.max(bestStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }
        return { current: currentStreak, best: bestStreak };
      };
      const streak = calculateStreaks();
      const finishedBooks = await Promise.all(
        allBooks.filter((book) => {
          if (book.status !== "finished" || !book.completedAt) return false;
          const completedDate = formatDateString(book.completedAt);
          return completedDate >= fromDate && completedDate <= clampedToDate;
        }).map(async (book) => {
          try {
            const stats = await storage.getReadingStats(book.id);
            const daysToFinish = book.startedAt && book.completedAt ? Math.ceil((book.completedAt.getTime() - book.startedAt.getTime()) / (1e3 * 60 * 60 * 24)) : 0;
            return {
              id: book.id,
              title: book.title,
              daysToFinish,
              avgPph: stats.averagePagesPerHour,
              completedAt: book.completedAt
            };
          } catch (error) {
            console.error(`Error calculating stats for finished book ${book.id}:`, error);
            return {
              id: book.id,
              title: book.title,
              daysToFinish: 0,
              avgPph: 0,
              completedAt: book.completedAt
            };
          }
        })
      );
      const activeEtas = await Promise.all(
        activeBooks.map(async (book) => {
          try {
            const progress = await storage.calculateProgress(book.id);
            const progressPct = book.totalPages ? (book.currentPage || 0) / book.totalPages : 0;
            return {
              bookId: book.id,
              title: book.title,
              progressPct: Math.round(progressPct * 100),
              etaDate: progress.eta ? formatDateString(progress.eta) : null,
              bitePages: progress.dailyTarget || 1
            };
          } catch (error) {
            console.error(`Error calculating progress for book ${book.id}:`, error);
            return {
              bookId: book.id,
              title: book.title,
              progressPct: 0,
              etaDate: null,
              bitePages: 1
            };
          }
        })
      );
      const sparkline = fullDailyTotals.map((day) => ({
        date: day.date,
        pages: day.pages
      }));
      const heatmap = fullDailyTotals.map((day) => ({
        date: day.date,
        pages: day.pages,
        minutes: day.minutes
      }));
      const daysInRange = allDatesInRange.length;
      const avgPagesPerDay = totals.pages / Math.max(1, daysInRange);
      const goals = {
        targetPages: Math.round(avgPagesPerDay * 30),
        // Extrapolate to 30 days
        targetMinutes: Math.round(totals.minutes / Math.max(1, daysInRange) * 30),
        biteTargetPerDay: Math.max(1, Math.round(avgPagesPerDay))
      };
      res.json({
        totals,
        goals,
        streak,
        finishedBooks: finishedBooks.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime()).map((book) => ({ id: book.id, title: book.title, daysToFinish: book.daysToFinish, avgPph: book.avgPph })),
        activeEtas,
        sparkline,
        heatmap,
        range: { from: fromDate, to: clampedToDate }
      });
    } catch (error) {
      console.error("Error fetching stats overview:", error);
      res.status(500).json({ error: "Failed to fetch stats overview" });
    }
  });
  app2.get("/api/books/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || query.trim().length < 2) {
        return res.status(400).json({ error: "Query must be at least 2 characters long" });
      }
      const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books&orderBy=relevance`;
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`Google Books API responded with status ${response.status}`);
      }
      const data = await response.json();
      const books2 = (data.items || []).map((item) => {
        const volumeInfo = item.volumeInfo || {};
        const imageLinks = volumeInfo.imageLinks || {};
        return {
          googleId: item.id,
          title: volumeInfo.title || "Unknown Title",
          authors: volumeInfo.authors || ["Unknown Author"],
          description: volumeInfo.description || "",
          publishedDate: volumeInfo.publishedDate || "",
          pageCount: volumeInfo.pageCount || 0,
          categories: volumeInfo.categories || [],
          thumbnail: imageLinks.thumbnail || imageLinks.smallThumbnail || "",
          isbn: volumeInfo.industryIdentifiers?.find((id) => id.type === "ISBN_13")?.identifier || volumeInfo.industryIdentifiers?.find((id) => id.type === "ISBN_10")?.identifier || "",
          publisher: volumeInfo.publisher || "",
          language: volumeInfo.language || "en",
          averageRating: volumeInfo.averageRating || 0,
          ratingsCount: volumeInfo.ratingsCount || 0
        };
      });
      res.json({ books: books2, total: data.totalItems || 0 });
    } catch (error) {
      console.error("Error searching books:", error);
      res.status(500).json({ error: "Failed to search books" });
    }
  });
  app2.post("/api/books/add-from-search", async (req, res) => {
    try {
      const searchResult = z2.object({
        googleId: z2.string().optional(),
        title: z2.string(),
        authors: z2.array(z2.string()).optional(),
        author: z2.string().optional(),
        description: z2.string().optional(),
        publishedDate: z2.string().optional(),
        pageCount: z2.number().optional(),
        categories: z2.array(z2.string()).optional(),
        thumbnail: z2.string().optional(),
        isbn: z2.string().optional(),
        publisher: z2.string().optional(),
        language: z2.string().optional(),
        averageRating: z2.number().optional(),
        ratingsCount: z2.number().optional(),
        genre: z2.string().optional(),
        status: z2.string().optional(),
        priority: z2.string().optional(),
        format: z2.string().optional(),
        totalPages: z2.number().optional()
      }).parse(req.body);
      const mapToOurGenre = (category) => {
        const lowerCategory = category.toLowerCase();
        if (lowerCategory.includes("fiction") || lowerCategory.includes("novel")) return "Fiction";
        if (lowerCategory.includes("business") || lowerCategory.includes("finance")) return "Business / Finance";
        if (lowerCategory.includes("self-help") || lowerCategory.includes("personal development")) return "Personal Development";
        if (lowerCategory.includes("philosophy") || lowerCategory.includes("spirituality")) return "Philosophy / Spirituality";
        if (lowerCategory.includes("psychology")) return "Psychology / Self-Improvement";
        if (lowerCategory.includes("history") || lowerCategory.includes("culture")) return "History / Culture";
        if (lowerCategory.includes("science") || lowerCategory.includes("technology")) return "Science / Technology";
        if (lowerCategory.includes("biography") || lowerCategory.includes("memoir")) return "Biography/Memoir";
        return "General Non-Fiction";
      };
      const genre = searchResult.categories && searchResult.categories.length > 0 ? mapToOurGenre(searchResult.categories[0]) : "General Non-Fiction";
      const bookData = {
        title: searchResult.title,
        author: Array.isArray(searchResult.authors) ? searchResult.authors.join(", ") : searchResult.author || "Unknown Author",
        genre,
        status: "toRead",
        priority: 3,
        // medium priority
        format: "paper",
        totalPages: searchResult.pageCount || 0,
        currentPage: 0,
        notes: searchResult.description || "",
        tags: searchResult.categories || [],
        progress: 0,
        topics: searchResult.categories || [],
        language: searchResult.language || "en"
      };
      const book = await storage.createBook(bookData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          error: "Invalid book data",
          details: error.errors
        });
      }
      console.error("Error adding book from search:", error);
      res.status(500).json({ error: "Failed to add book" });
    }
  });
  app2.post("/api/books/import", async (req, res) => {
    try {
      const { books: books2, options } = req.body;
      if (!Array.isArray(books2)) {
        return res.status(400).json({ error: "Books must be an array" });
      }
      const importResult = {
        success: true,
        imported: 0,
        errors: [],
        duplicates: 0
      };
      const existingBooks = await storage.getAllBooks();
      const existingBooksMap = new Map(
        existingBooks.map((book) => [`${book.title.toLowerCase()}-${book.author.toLowerCase()}`, book])
      );
      for (let i = 0; i < books2.length; i++) {
        const bookData = books2[i];
        try {
          if (!bookData.title || !bookData.author) {
            importResult.errors.push(`Row ${i + 1}: Missing title or author`);
            continue;
          }
          const key = `${bookData.title.toLowerCase()}-${bookData.author.toLowerCase()}`;
          const existingBook = existingBooksMap.get(key);
          if (existingBook) {
            if (options?.skipDuplicates && !options?.updateExisting) {
              importResult.duplicates++;
              continue;
            }
            if (options?.updateExisting) {
              const updates = {
                genre: bookData.genre || existingBook.genre,
                status: bookData.status || existingBook.status,
                priority: bookData.priority || existingBook.priority,
                format: bookData.format || existingBook.format,
                totalPages: bookData.totalPages || existingBook.totalPages,
                language: bookData.language || existingBook.language,
                tags: bookData.tags || existingBook.tags,
                notes: bookData.notes || existingBook.notes,
                ...options?.preserveProgress ? {} : {
                  currentPage: bookData.currentPage || 0,
                  progress: bookData.progress || 0
                }
              };
              await storage.updateBook(existingBook.id, updates);
              importResult.imported++;
              continue;
            }
          }
          const newBook = {
            title: bookData.title,
            author: bookData.author,
            genre: bookData.genre || "General Non-Fiction",
            status: bookData.status || "toRead",
            priority: bookData.priority || 3,
            format: bookData.format || "paper",
            totalPages: bookData.totalPages || 0,
            currentPage: bookData.currentPage || 0,
            progress: bookData.progress || 0,
            language: bookData.language || "English",
            tags: bookData.tags || [],
            notes: bookData.notes || [],
            topics: bookData.tags || []
          };
          await storage.createBook(newBook);
          importResult.imported++;
        } catch (error) {
          console.error(`Error importing book ${i + 1}:`, error);
          importResult.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      if (importResult.errors.length > 0) {
        importResult.success = false;
      }
      res.json(importResult);
    } catch (error) {
      console.error("Error importing books:", error);
      res.status(500).json({ error: "Failed to import books" });
    }
  });
  app2.get("/api/books/export", async (req, res) => {
    try {
      const format = req.query.format || "json";
      const includeNotes = req.query.includeNotes === "true";
      const includeTags = req.query.includeTags === "true";
      const statusFilter = req.query.status;
      let books2 = await storage.getAllBooks();
      if (statusFilter) {
        const statuses = statusFilter.split(",");
        books2 = books2.filter((book) => statuses.includes(book.status));
      }
      if (format === "csv") {
        const headers = [
          "Title",
          "Author",
          "Genre",
          "Status",
          "Priority",
          "Format",
          "Total Pages",
          "Current Page",
          "Progress",
          "Language",
          "Added Date",
          "Started Date",
          "Completed Date",
          "Last Read Date",
          ...includeTags ? ["Tags"] : [],
          ...includeNotes ? ["Notes"] : []
        ];
        const rows = books2.map((book) => {
          const row = [
            book.title || "",
            book.author || "",
            book.genre || "",
            book.status || "",
            book.priority?.toString() || "",
            book.format || "",
            book.totalPages?.toString() || "",
            book.currentPage?.toString() || "",
            `${Math.round((book.progress || 0) * 100)}%`,
            book.language || "",
            book.addedAt ? new Date(book.addedAt).toISOString().split("T")[0] : "",
            book.startedAt ? new Date(book.startedAt).toISOString().split("T")[0] : "",
            book.completedAt ? new Date(book.completedAt).toISOString().split("T")[0] : "",
            book.lastReadAt ? new Date(book.lastReadAt).toISOString().split("T")[0] : "",
            ...includeTags ? [(book.tags || []).join("; ")] : [],
            ...includeNotes ? [(book.notes || []).join("; ")] : []
          ];
          return row.map((cell) => {
            const str = String(cell);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          });
        });
        const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="my-library.csv"');
        res.send(csvContent);
      } else {
        const exportData = {
          exportDate: (/* @__PURE__ */ new Date()).toISOString(),
          totalBooks: books2.length,
          books: books2.map((book) => ({
            title: book.title,
            author: book.author,
            genre: book.genre,
            status: book.status,
            priority: book.priority,
            format: book.format,
            totalPages: book.totalPages,
            currentPage: book.currentPage,
            progress: book.progress,
            language: book.language,
            addedAt: book.addedAt,
            startedAt: book.startedAt,
            completedAt: book.completedAt,
            lastReadAt: book.lastReadAt,
            ...includeTags && { tags: book.tags },
            ...includeNotes && { notes: book.notes }
          }))
        };
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", 'attachment; filename="my-library.json"');
        res.json(exportData);
      }
    } catch (error) {
      console.error("Error exporting books:", error);
      res.status(500).json({ error: "Failed to export books" });
    }
  });
  app2.get("/api/reading-goals", async (req, res) => {
    try {
      const goals = await storage.getAllReadingGoals();
      res.json(goals);
    } catch (error) {
      console.error("Error fetching reading goals:", error);
      res.status(500).json({ error: "Failed to fetch reading goals" });
    }
  });
  app2.post("/api/reading-goals", async (req, res) => {
    try {
      const goalData = insertReadingGoalSchema.parse(req.body);
      const goal = await storage.createReadingGoal(goalData);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid goal data", details: error.errors });
      }
      console.error("Error creating reading goal:", error);
      res.status(500).json({ error: "Failed to create reading goal" });
    }
  });
  app2.patch("/api/reading-goals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateReadingGoalSchema.parse(req.body);
      const goal = await storage.updateReadingGoal(id, updates);
      res.json(goal);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid goal data", details: error.errors });
      }
      console.error("Error updating reading goal:", error);
      res.status(500).json({ error: "Failed to update reading goal" });
    }
  });
  app2.delete("/api/reading-goals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteReadingGoal(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reading goal:", error);
      res.status(500).json({ error: "Failed to delete reading goal" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = Number(process.env.PORT || 5e3);
  const host = process.env.HOST || "127.0.0.1";
  server.listen(port, host, () => {
    log(`http://${host}:${port}`);
  });
})();
