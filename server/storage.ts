import { type Book, type InsertBook, type UpdateBook, BOOK_STATUSES } from "@shared/schema";
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

export interface IStorage {
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
}

export class MemStorage implements IStorage {
  private books: Map<string, Book>;

  constructor() {
    this.books = new Map();
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
    return this.books.delete(id);
  }
}

export const storage = new MemStorage();
