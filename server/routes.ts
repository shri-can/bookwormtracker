import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, type BookFilters } from "./storage";
import { insertBookSchema, updateBookSchema, statusEnum } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Book CRUD routes
  
  // Get all books with filtering
  app.get("/api/books", async (req, res) => {
    try {
      const filters: BookFilters = {};
      
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.statuses) {
        const statuses = Array.isArray(req.query.statuses) 
          ? req.query.statuses as string[] 
          : [req.query.statuses as string];
        filters.statuses = statuses;
      }
      if (req.query.genres) {
        const genres = Array.isArray(req.query.genres) 
          ? req.query.genres as string[] 
          : [req.query.genres as string];
        filters.genres = genres;
      }
      if (req.query.tags) {
        const tags = Array.isArray(req.query.tags) 
          ? req.query.tags as string[] 
          : [req.query.tags as string];
        filters.tags = tags;
      }
      if (req.query.formats) {
        const formats = Array.isArray(req.query.formats) 
          ? req.query.formats as string[] 
          : [req.query.formats as string];
        filters.formats = formats;
      }
      if (req.query.languages) {
        const languages = Array.isArray(req.query.languages) 
          ? req.query.languages as string[] 
          : [req.query.languages as string];
        filters.languages = languages;
      }
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

  const httpServer = createServer(app);
  return httpServer;
}
