import { type Book, type InsertBook, type UpdateBook } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getBook(id: string): Promise<Book | undefined>;
  getAllBooks(): Promise<Book[]>;
  getCurrentlyReadingBooks(): Promise<Book[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: string, updates: UpdateBook): Promise<Book | undefined>;
  deleteBook(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private books: Map<string, Book>;

  constructor() {
    this.books = new Map();
  }

  async getBook(id: string): Promise<Book | undefined> {
    return this.books.get(id);
  }

  async getAllBooks(): Promise<Book[]> {
    return Array.from(this.books.values());
  }

  async getCurrentlyReadingBooks(): Promise<Book[]> {
    return Array.from(this.books.values()).filter(book => book.isCurrentlyReading);
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const id = randomUUID();
    const book: Book = { 
      ...insertBook, 
      id,
      currentPage: insertBook.currentPage || 0,
      isCurrentlyReading: insertBook.isCurrentlyReading || false,
      notes: insertBook.notes || [],
      topics: insertBook.topics || [],
      usefulness: insertBook.usefulness || null,
      totalPages: insertBook.totalPages || null,
      startedAt: insertBook.startedAt || null,
      completedAt: insertBook.completedAt || null,
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
