import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, type BookFilters } from "./storage";
import { 
  insertBookSchema, 
  updateBookSchema, 
  statusEnum,
  insertReadingSessionSchema,
  updateReadingSessionSchema,
  insertBookNoteSchema,
  updateBookNoteSchema,
  insertBookReadingStateSchema,
  updateBookReadingStateSchema,
  startSessionSchema,
  pauseSessionSchema,
  stopSessionSchema,
  quickAddPagesSchema,
  insertReadingGoalSchema,
  updateReadingGoalSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Book CRUD routes
  
  // Get all books with filtering
  // Helper function to parse multi-value query parameters (handles comma-separated values)
  const parseMultiValue = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.flatMap(v => String(v).split(",").map(s => s.trim()).filter(Boolean));
    }
    return String(value).split(",").map(s => s.trim()).filter(Boolean);
  };

  app.get("/api/books", async (req, res) => {
    try {
      const filters: BookFilters = {};
      
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.statuses) filters.statuses = parseMultiValue(req.query.statuses);
      if (req.query.genres) filters.genres = parseMultiValue(req.query.genres);
      if (req.query.tags) filters.tags = parseMultiValue(req.query.tags);
      if (req.query.formats) filters.formats = parseMultiValue(req.query.formats);
      if (req.query.languages) filters.languages = parseMultiValue(req.query.languages);
      if (req.query.sort) filters.sort = req.query.sort as any;
      if (req.query.sortOrder) filters.sortOrder = req.query.sortOrder as "asc" | "desc";

      const books = await storage.getAllBooks(filters);
      res.json(books);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  // Get currently reading books  
  app.get("/api/books/currently-reading", async (req, res) => {
    try {
      const books = await storage.getCurrentlyReadingBooks();
      res.json(books);
    } catch (error) {
      console.error("Error fetching currently reading books:", error);
      res.status(500).json({ error: "Failed to fetch currently reading books" });
    }
  });

  // Get a specific book
  app.get("/api/books/:id", async (req, res) => {
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

  // Create a new book
  app.post("/api/books", async (req, res) => {
    try {
      const validatedData = insertBookSchema.parse(req.body);
      const book = await storage.createBook(validatedData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid book data", details: error.errors });
      }
      console.error("Error creating book:", error);
      res.status(500).json({ error: "Failed to create book" });
    }
  });

  // Update a book
  app.patch("/api/books/:id", async (req, res) => {
    try {
      const validatedData = updateBookSchema.parse(req.body);
      const book = await storage.updateBook(req.params.id, validatedData);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      console.error("Error updating book:", error);
      res.status(500).json({ error: "Failed to update book" });
    }
  });

  // Delete a book
  app.delete("/api/books/:id", async (req, res) => {
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

  // Bulk operations
  
  // Bulk update book status
  app.post("/api/books/bulk/status", async (req, res) => {
    try {
      const { ids, status } = req.body;
      
      if (!Array.isArray(ids) || !status) {
        return res.status(400).json({ error: "Invalid request: ids array and status required" });
      }
      
      // Validate status
      const validStatus = statusEnum.parse(status);
      
      const updatedBooks = await storage.updateBooksStatus(ids, validStatus);
      res.json(updatedBooks);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid status", details: error.errors });
      }
      console.error("Error updating book statuses:", error);
      res.status(500).json({ error: "Failed to update book statuses" });
    }
  });

  // Bulk add tags to books
  app.post("/api/books/bulk/tags", async (req, res) => {
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

  // Bulk delete books
  app.delete("/api/books/bulk", async (req, res) => {
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

  // Get books by status
  app.get("/api/books/status/:status", async (req, res) => {
    try {
      const status = req.params.status;
      const books = await storage.getBooksByStatus(status);
      res.json(books);
    } catch (error) {
      console.error("Error fetching books by status:", error);
      res.status(500).json({ error: "Failed to fetch books by status" });
    }
  });

  // ========== SESSION MANAGEMENT ROUTES ==========

  // Session workflow operations
  
  // Start a new reading session
  app.post("/api/sessions/start", async (req, res) => {
    try {
      const validatedData = startSessionSchema.parse(req.body);
      const session = await storage.startSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      if (error instanceof Error && error.message.includes("already has an active session")) {
        return res.status(409).json({ error: error.message });
      }
      console.error("Error starting session:", error);
      res.status(500).json({ error: "Failed to start session" });
    }
  });

  // Pause an active reading session
  app.post("/api/sessions/:id/pause", async (req, res) => {
    try {
      const validatedData = pauseSessionSchema.parse({ sessionId: req.params.id, ...req.body });
      const session = await storage.pauseSession(validatedData);
      if (!session) {
        return res.status(404).json({ error: "Session not found or not active" });
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid pause data", details: error.errors });
      }
      console.error("Error pausing session:", error);
      res.status(500).json({ error: "Failed to pause session" });
    }
  });

  // Resume a paused reading session
  app.post("/api/sessions/:id/resume", async (req, res) => {
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

  // Stop a reading session
  app.post("/api/sessions/:id/stop", async (req, res) => {
    try {
      const validatedData = stopSessionSchema.parse({ sessionId: req.params.id, ...req.body });
      const session = await storage.stopSession(validatedData);
      if (!session) {
        return res.status(404).json({ error: "Session not found or not active/paused" });
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid stop data", details: error.errors });
      }
      console.error("Error stopping session:", error);
      res.status(500).json({ error: "Failed to stop session" });
    }
  });

  // Quick add pages without timer
  app.post("/api/sessions/quick-add", async (req, res) => {
    try {
      const validatedData = quickAddPagesSchema.parse(req.body);
      const session = await storage.quickAddPages(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid quick add data", details: error.errors });
      }
      console.error("Error quick adding pages:", error);
      res.status(500).json({ error: "Failed to quick add pages" });
    }
  });

  // Session CRUD operations
  
  // Get a specific reading session
  app.get("/api/sessions/:id", async (req, res) => {
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

  // Get sessions for a book
  app.get("/api/books/:bookId/sessions", async (req, res) => {
    try {
      const filters: any = {};
      
      if (req.query.state) filters.state = req.query.state;
      if (req.query.sessionType) filters.sessionType = req.query.sessionType;
      if (req.query.limit) filters.limit = parseInt(req.query.limit as string);
      
      if (req.query.startDate && req.query.endDate) {
        filters.dateRange = {
          start: new Date(req.query.startDate as string),
          end: new Date(req.query.endDate as string)
        };
      }

      const sessions = await storage.getSessionsByBook(req.params.bookId, filters);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching book sessions:", error);
      res.status(500).json({ error: "Failed to fetch book sessions" });
    }
  });

  // Get recent sessions across all books
  app.get("/api/sessions/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const sessions = await storage.getRecentSessions(limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching recent sessions:", error);
      res.status(500).json({ error: "Failed to fetch recent sessions" });
    }
  });

  // Get active session for a book
  app.get("/api/books/:bookId/active-session", async (req, res) => {
    try {
      const session = await storage.getActiveSession(req.params.bookId);
      res.json(session);
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ error: "Failed to fetch active session" });
    }
  });

  // Get all active sessions
  app.get("/api/sessions/active", async (req, res) => {
    try {
      const sessions = await storage.getAllActiveSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });

  // Update a reading session
  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const validatedData = updateReadingSessionSchema.parse(req.body);
      const session = await storage.updateSession(req.params.id, validatedData);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid session update data", details: error.errors });
      }
      console.error("Error updating session:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // Delete a reading session
  app.delete("/api/sessions/:id", async (req, res) => {
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

  // ========== NOTES AND QUOTES ROUTES ==========

  // Get a specific note
  app.get("/api/notes/:id", async (req, res) => {
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

  // Get notes for a book
  app.get("/api/books/:bookId/notes", async (req, res) => {
    try {
      const notes = await storage.getNotesByBook(req.params.bookId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching book notes:", error);
      res.status(500).json({ error: "Failed to fetch book notes" });
    }
  });

  // Get notes for a session
  app.get("/api/sessions/:sessionId/notes", async (req, res) => {
    try {
      const notes = await storage.getNotesBySession(req.params.sessionId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching session notes:", error);
      res.status(500).json({ error: "Failed to fetch session notes" });
    }
  });

  // Create a new note
  app.post("/api/notes", async (req, res) => {
    try {
      const validatedData = insertBookNoteSchema.parse(req.body);
      const note = await storage.createNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid note data", details: error.errors });
      }
      console.error("Error creating note:", error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // Update a note
  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const validatedData = updateBookNoteSchema.parse(req.body);
      const note = await storage.updateNote(req.params.id, validatedData);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid note update data", details: error.errors });
      }
      console.error("Error updating note:", error);
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  // Delete a note
  app.delete("/api/notes/:id", async (req, res) => {
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

  // ========== READING STATE AND PROGRESS ROUTES ==========

  // Get reading state for a book
  app.get("/api/books/:bookId/reading-state", async (req, res) => {
    try {
      const readingState = await storage.getReadingState(req.params.bookId);
      res.json(readingState);
    } catch (error) {
      console.error("Error fetching reading state:", error);
      res.status(500).json({ error: "Failed to fetch reading state" });
    }
  });

  // Update reading state for a book
  app.patch("/api/books/:bookId/reading-state", async (req, res) => {
    try {
      const validatedData = updateBookReadingStateSchema.parse(req.body);
      const readingState = await storage.updateReadingState(req.params.bookId, validatedData);
      res.json(readingState);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid reading state data", details: error.errors });
      }
      console.error("Error updating reading state:", error);
      res.status(500).json({ error: "Failed to update reading state" });
    }
  });

  // Calculate and get progress forecast for a book
  app.post("/api/books/:bookId/calculate-progress", async (req, res) => {
    try {
      const forecast = await storage.calculateProgress(req.params.bookId);
      res.json(forecast);
    } catch (error) {
      console.error("Error calculating progress:", error);
      res.status(500).json({ error: "Failed to calculate progress" });
    }
  });

  // Update book progress (page or percentage)
  app.patch("/api/books/:bookId/progress", async (req, res) => {
    try {
      const { currentPage, progressPercent } = req.body;
      
      if (currentPage === undefined && progressPercent === undefined) {
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

  // ========== ANALYTICS AND STATS ROUTES ==========

  // Get reading statistics for a book
  app.get("/api/books/:bookId/stats", async (req, res) => {
    try {
      const stats = await storage.getReadingStats(req.params.bookId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching reading stats:", error);
      res.status(500).json({ error: "Failed to fetch reading stats" });
    }
  });

  // Get daily reading statistics
  app.get("/api/stats/daily", async (req, res) => {
    try {
      const dateParam = req.query.date as string;
      const date = dateParam ? new Date(dateParam) : new Date();
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      
      const stats = await storage.getDailyReadingStats(date);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ error: "Failed to fetch daily stats" });
    }
  });

  // Get comprehensive reading stats overview
  app.get("/api/stats/overview", async (req, res) => {
    try {
      const fromParam = req.query.from as string;
      const toParam = req.query.to as string;
      
      // Helper functions for proper date handling
      const formatDateString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const parseAndValidateDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (!match) return null;
        
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 0-indexed
        const day = parseInt(match[3], 10);
        
        const date = new Date(year, month, day);
        if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
          return null; // Invalid date
        }
        
        return date;
      };
      
      const generateDateRange = (start: string, end: string): string[] => {
        const dates: string[] = [];
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
      
      // Default to last 30 days if no range provided
      const today = new Date();
      const defaultFrom = new Date(today);
      defaultFrom.setDate(today.getDate() - 30);
      
      const fromDate = fromParam ? 
        (parseAndValidateDate(fromParam) ? formatDateString(parseAndValidateDate(fromParam)!) : null) :
        formatDateString(defaultFrom);
      
      const toDate = toParam ? 
        (parseAndValidateDate(toParam) ? formatDateString(parseAndValidateDate(toParam)!) : null) :
        formatDateString(today);
      
      // Validate dates
      if (!fromDate || !toDate) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }
      
      // Clamp toDate to today if it's in the future
      const todayStr = formatDateString(today);
      const clampedToDate = toDate > todayStr ? todayStr : toDate;
      
      // Validate range
      if (fromDate > clampedToDate) {
        return res.status(400).json({ error: "From date must be before or equal to to date." });
      }
      
      // Extend range backwards for streak calculation (up to 365 days from end of range)
      const clampedToDateObj = parseAndValidateDate(clampedToDate)!;
      const extendedStartDate = new Date(clampedToDateObj);
      extendedStartDate.setDate(clampedToDateObj.getDate() - 365);
      const extendedFrom = formatDateString(extendedStartDate);
      
      // Get daily totals for both the requested range and extended range for streaks
      const [dailyTotalsData, extendedDailyTotalsData, allBooks, activeBooks] = await Promise.all([
        storage.getDailyTotalsInRange(fromDate, clampedToDate),
        storage.getDailyTotalsInRange(extendedFrom, clampedToDate),
        storage.getAllBooks(),
        storage.getCurrentlyReadingBooks()
      ]);
      
      // Create full date range with zero-fill for missing days
      const allDatesInRange = generateDateRange(fromDate, clampedToDate);
      const dailyTotalsMap = new Map(dailyTotalsData.map(day => [day.date, day]));
      const extendedDailyTotalsMap = new Map(extendedDailyTotalsData.map(day => [day.date, day]));
      
      const fullDailyTotals = allDatesInRange.map(date => 
        dailyTotalsMap.get(date) || { 
          id: 0, 
          date, 
          pages: 0, 
          minutes: 0, 
          sessions: 0 
        }
      );
      
      // Calculate totals
      const totals = {
        pages: fullDailyTotals.reduce((sum, day) => sum + day.pages, 0),
        minutes: fullDailyTotals.reduce((sum, day) => sum + day.minutes, 0),
        sessions: fullDailyTotals.reduce((sum, day) => sum + day.sessions, 0),
      };
      
      // Calculate streaks properly
      const calculateStreaks = () => {
        // Get extended data for current streak calculation (anchored to requested end date)
        const extendedDates = generateDateRange(extendedFrom, clampedToDate);
        const extendedDailyTotals = extendedDates.map(date => {
          const existingDay = extendedDailyTotalsMap.get(date);
          return existingDay || { id: 0, date, pages: 0, minutes: 0, sessions: 0 };
        });
        
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;
        
        // Calculate current streak (work backwards from the end of requested range)
        for (let i = extendedDailyTotals.length - 1; i >= 0; i--) {
          const day = extendedDailyTotals[i];
          const isReadDay = day.pages >= 1 || day.minutes >= 5;
          
          if (isReadDay) {
            currentStreak++;
          } else {
            break; // End of current streak
          }
        }
        
        // Calculate best streak in the requested range
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
      
      // Get finished books in range (using date-only comparison)
      const finishedBooks = await Promise.all(
        allBooks
          .filter(book => {
            if (book.status !== "finished" || !book.completedAt) return false;
            const completedDate = formatDateString(book.completedAt);
            return completedDate >= fromDate && completedDate <= clampedToDate;
          })
          .map(async (book) => {
            try {
              const stats = await storage.getReadingStats(book.id);
              const daysToFinish = book.startedAt && book.completedAt ? 
                Math.ceil((book.completedAt.getTime() - book.startedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
              
              return {
                id: book.id,
                title: book.title,
                daysToFinish,
                avgPph: stats.averagePagesPerHour,
                completedAt: book.completedAt,
              };
            } catch (error) {
              console.error(`Error calculating stats for finished book ${book.id}:`, error);
              return {
                id: book.id,
                title: book.title,
                daysToFinish: 0,
                avgPph: 0,
                completedAt: book.completedAt,
              };
            }
          })
      );
      
      // Get active books with ETAs
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
              bitePages: progress.dailyTarget || 1,
            };
          } catch (error) {
            console.error(`Error calculating progress for book ${book.id}:`, error);
            return {
              bookId: book.id,
              title: book.title,
              progressPct: 0,
              etaDate: null,
              bitePages: 1,
            };
          }
        })
      );
      
      // Create sparkline data with zero-fill
      const sparkline = fullDailyTotals.map(day => ({
        date: day.date,
        pages: day.pages,
      }));
      
      // Create heatmap data with zero-fill
      const heatmap = fullDailyTotals.map(day => ({
        date: day.date,
        pages: day.pages,
        minutes: day.minutes,
      }));
      
      // Goal calculation based on range
      const daysInRange = allDatesInRange.length;
      const avgPagesPerDay = totals.pages / Math.max(1, daysInRange);
      
      const goals = {
        targetPages: Math.round(avgPagesPerDay * 30), // Extrapolate to 30 days
        targetMinutes: Math.round((totals.minutes / Math.max(1, daysInRange)) * 30),
        biteTargetPerDay: Math.max(1, Math.round(avgPagesPerDay)),
      };
      
      res.json({
        totals,
        goals,
        streak,
        finishedBooks: finishedBooks
          .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())
          .map(book => ({ id: book.id, title: book.title, daysToFinish: book.daysToFinish, avgPph: book.avgPph })),
        activeEtas,
        sparkline,
        heatmap,
        range: { from: fromDate, to: clampedToDate },
      });
    } catch (error) {
      console.error("Error fetching stats overview:", error);
      res.status(500).json({ error: "Failed to fetch stats overview" });
    }
  });

  // Search books using Google Books API
  app.get("/api/books/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.status(400).json({ error: "Query must be at least 2 characters long" });
      }

      const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books&orderBy=relevance`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`Google Books API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform Google Books API response to our format
      const books = (data.items || []).map((item: any) => {
        const volumeInfo = item.volumeInfo || {};
        const imageLinks = volumeInfo.imageLinks || {};
        
        return {
          googleId: item.id,
          title: volumeInfo.title || 'Unknown Title',
          authors: volumeInfo.authors || ['Unknown Author'],
          description: volumeInfo.description || '',
          publishedDate: volumeInfo.publishedDate || '',
          pageCount: volumeInfo.pageCount || 0,
          categories: volumeInfo.categories || [],
          thumbnail: imageLinks.thumbnail || imageLinks.smallThumbnail || '',
          isbn: volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier ||
                volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier || '',
          publisher: volumeInfo.publisher || '',
          language: volumeInfo.language || 'en',
          averageRating: volumeInfo.averageRating || 0,
          ratingsCount: volumeInfo.ratingsCount || 0,
        };
      });

      res.json({ books, total: data.totalItems || 0 });
    } catch (error) {
      console.error("Error searching books:", error);
      res.status(500).json({ error: "Failed to search books" });
    }
  });

  // Add book from search result
  app.post("/api/books/add-from-search", async (req, res) => {
    try {
      const searchResult = z.object({
        googleId: z.string().optional(),
        title: z.string(),
        authors: z.array(z.string()).optional(),
        author: z.string().optional(),
        description: z.string().optional(),
        publishedDate: z.string().optional(),
        pageCount: z.number().optional(),
        categories: z.array(z.string()).optional(),
        thumbnail: z.string().optional(),
        isbn: z.string().optional(),
        publisher: z.string().optional(),
        language: z.string().optional(),
        averageRating: z.number().optional(),
        ratingsCount: z.number().optional(),
        genre: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        format: z.string().optional(),
        totalPages: z.number().optional(),
      }).parse(req.body);

      // Extract main genre from categories and map to our genres
      const mapToOurGenre = (category: string): string => {
        const lowerCategory = category.toLowerCase();
        if (lowerCategory.includes('fiction') || lowerCategory.includes('novel')) return 'Fiction';
        if (lowerCategory.includes('business') || lowerCategory.includes('finance')) return 'Business / Finance';
        if (lowerCategory.includes('self-help') || lowerCategory.includes('personal development')) return 'Self-Help / Personal Development';
        if (lowerCategory.includes('philosophy') || lowerCategory.includes('spirituality')) return 'Philosophy / Spirituality';
        if (lowerCategory.includes('psychology')) return 'Psychology / Self-Improvement';
        if (lowerCategory.includes('history') || lowerCategory.includes('culture')) return 'History / Culture';
        if (lowerCategory.includes('science') || lowerCategory.includes('technology')) return 'Science / Technology';
        if (lowerCategory.includes('biography') || lowerCategory.includes('memoir')) return 'Biography/Memoir';
        return 'General Non-Fiction';
      };
      
      const genre = searchResult.categories && searchResult.categories.length > 0 
        ? mapToOurGenre(searchResult.categories[0])
        : 'General Non-Fiction';

      // Convert search result to book format
      const bookData = {
        title: searchResult.title,
        author: Array.isArray(searchResult.authors) ? searchResult.authors.join(', ') : searchResult.author || 'Unknown Author',
        genre: genre as "Fiction" | "Self-Help / Personal Development" | "Business / Finance" | "Philosophy / Spirituality" | "Psychology / Self-Improvement" | "History / Culture" | "Science / Technology" | "General Non-Fiction" | "Biography/Memoir",
        status: 'toRead' as const,
        priority: 3, // medium priority
        format: 'paper' as const,
        totalPages: searchResult.pageCount || 0,
        currentPage: 0,
        notes: searchResult.description || '',
        tags: searchResult.categories || [],
        progress: 0,
        topics: searchResult.categories || [],
        language: searchResult.language || 'en',
      };

      const book = await storage.createBook(bookData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid book data", 
          details: error.errors 
        });
      }
      console.error("Error adding book from search:", error);
      res.status(500).json({ error: "Failed to add book" });
    }
  });

  // Import books from CSV/JSON
  app.post("/api/books/import", async (req, res) => {
    try {
      const { books, options } = req.body;
      
      if (!Array.isArray(books)) {
        return res.status(400).json({ error: "Books must be an array" });
      }

      const importResult = {
        success: true,
        imported: 0,
        errors: [] as string[],
        duplicates: 0,
      };

      // Get existing books for duplicate detection
      const existingBooks = await storage.getAllBooks();
      const existingBooksMap = new Map(
        existingBooks.map(book => [`${book.title.toLowerCase()}-${book.author.toLowerCase()}`, book])
      );

      for (let i = 0; i < books.length; i++) {
        const bookData = books[i];
        
        try {
          // Validate required fields
          if (!bookData.title || !bookData.author) {
            importResult.errors.push(`Row ${i + 1}: Missing title or author`);
            continue;
          }

          // Check for duplicates
          const key = `${bookData.title.toLowerCase()}-${bookData.author.toLowerCase()}`;
          const existingBook = existingBooksMap.get(key);
          
          if (existingBook) {
            if (options?.skipDuplicates && !options?.updateExisting) {
              importResult.duplicates++;
              continue;
            }
            
            if (options?.updateExisting) {
              // Update existing book
              const updates = {
                genre: bookData.genre || existingBook.genre,
                status: bookData.status || existingBook.status,
                priority: bookData.priority || existingBook.priority,
                format: bookData.format || existingBook.format,
                totalPages: bookData.totalPages || existingBook.totalPages,
                language: bookData.language || existingBook.language,
                tags: bookData.tags || existingBook.tags,
                notes: bookData.notes || existingBook.notes,
                ...(options?.preserveProgress ? {} : {
                  currentPage: bookData.currentPage || 0,
                  progress: bookData.progress || 0,
                }),
              };
              
              await storage.updateBook(existingBook.id, updates);
              importResult.imported++;
              continue;
            }
          }

          // Create new book
          const newBook = {
            title: bookData.title,
            author: bookData.author,
            genre: bookData.genre || 'General Non-Fiction',
            status: bookData.status || 'toRead',
            priority: bookData.priority || 3,
            format: bookData.format || 'paper',
            totalPages: bookData.totalPages || 0,
            currentPage: bookData.currentPage || 0,
            progress: bookData.progress || 0,
            language: bookData.language || 'English',
            tags: bookData.tags || [],
            notes: bookData.notes || [],
            topics: bookData.tags || [],
          };

          await storage.createBook(newBook);
          importResult.imported++;
          
        } catch (error) {
          console.error(`Error importing book ${i + 1}:`, error);
          importResult.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Export books as CSV/JSON
  app.get("/api/books/export", async (req, res) => {
    try {
      const format = req.query.format as string || 'json';
      const includeNotes = req.query.includeNotes === 'true';
      const includeTags = req.query.includeTags === 'true';
      const statusFilter = req.query.status as string;
      
      let books = await storage.getAllBooks();
      
      // Filter by status if specified
      if (statusFilter) {
        const statuses = statusFilter.split(',');
        books = books.filter(book => statuses.includes(book.status));
      }

      if (format === 'csv') {
        const headers = [
          'Title',
          'Author', 
          'Genre',
          'Status',
          'Priority',
          'Format',
          'Total Pages',
          'Current Page',
          'Progress',
          'Language',
          'Added Date',
          'Started Date',
          'Completed Date',
          'Last Read Date',
          ...(includeTags ? ['Tags'] : []),
          ...(includeNotes ? ['Notes'] : []),
        ];

        const rows = books.map(book => {
          const row = [
            book.title || '',
            book.author || '',
            book.genre || '',
            book.status || '',
            book.priority?.toString() || '',
            book.format || '',
            book.totalPages?.toString() || '',
            book.currentPage?.toString() || '',
            `${Math.round((book.progress || 0) * 100)}%`,
            book.language || '',
            book.addedAt ? new Date(book.addedAt).toISOString().split('T')[0] : '',
            book.startedAt ? new Date(book.startedAt).toISOString().split('T')[0] : '',
            book.completedAt ? new Date(book.completedAt).toISOString().split('T')[0] : '',
            book.lastReadAt ? new Date(book.lastReadAt).toISOString().split('T')[0] : '',
            ...(includeTags ? [(book.tags || []).join('; ')] : []),
            ...(includeNotes ? [(book.notes || []).join('; ')] : []),
          ];
          
          return row.map(cell => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          });
        });

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="my-library.csv"');
        res.send(csvContent);
      } else {
        // JSON export
        const exportData = {
          exportDate: new Date().toISOString(),
          totalBooks: books.length,
          books: books.map(book => ({
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
            ...(includeTags && { tags: book.tags }),
            ...(includeNotes && { notes: book.notes }),
          })),
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="my-library.json"');
        res.json(exportData);
      }
    } catch (error) {
      console.error("Error exporting books:", error);
      res.status(500).json({ error: "Failed to export books" });
    }
  });

  // Reading Goals API endpoints
  app.get("/api/reading-goals", async (req, res) => {
    try {
      const goals = await storage.getAllReadingGoals();
      res.json(goals);
    } catch (error) {
      console.error("Error fetching reading goals:", error);
      res.status(500).json({ error: "Failed to fetch reading goals" });
    }
  });

  app.post("/api/reading-goals", async (req, res) => {
    try {
      const goalData = insertReadingGoalSchema.parse(req.body);
      const goal = await storage.createReadingGoal(goalData);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid goal data", details: error.errors });
      }
      console.error("Error creating reading goal:", error);
      res.status(500).json({ error: "Failed to create reading goal" });
    }
  });

  app.patch("/api/reading-goals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateReadingGoalSchema.parse(req.body);
      const goal = await storage.updateReadingGoal(id, updates);
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid goal data", details: error.errors });
      }
      console.error("Error updating reading goal:", error);
      res.status(500).json({ error: "Failed to update reading goal" });
    }
  });

  app.delete("/api/reading-goals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteReadingGoal(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reading goal:", error);
      res.status(500).json({ error: "Failed to delete reading goal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
