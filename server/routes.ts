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
  quickAddPagesSchema
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

  const httpServer = createServer(app);
  return httpServer;
}
