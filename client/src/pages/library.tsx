import { useState } from "react";
import { BookCard } from "@/components/book-card";
import { AddBookDialog } from "@/components/add-book-dialog";
import { BulkUploadDialog } from "@/components/bulk-upload-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BOOK_GENRES } from "@shared/schema";
import type { Book, InsertBook } from "@shared/schema";

export default function Library() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const queryClient = useQueryClient();

  // Fetch books from API
  const { data: books = [], isLoading, error } = useQuery<Book[]>({
    queryKey: ["/api/books"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/books");
      return response.json();
    },
  });

  // Add book mutation
  const addBookMutation = useMutation({
    mutationFn: async (bookData: InsertBook) => {
      const response = await apiRequest("POST", "/api/books", bookData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
    },
  });

  // Update book mutation
  const updateBookMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Book> }) => {
      const response = await apiRequest("PATCH", `/api/books/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
    },
  });

  // Delete book mutation
  const deleteBookMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/books/${id}`);
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
    },
  });

  const allGenres = Array.from(new Set(books.map((book: Book) => book.genre)));

  const filteredBooks = books.filter((book: Book) => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre === "all" || book.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const handleAddBook = async (bookData: InsertBook) => {
    try {
      await addBookMutation.mutateAsync(bookData);
      console.log("Book added to library:", bookData);
    } catch (error) {
      console.error("Failed to add book:", error);
    }
  };

  const handleBulkUpload = async (newBooks: InsertBook[]) => {
    try {
      // Add books one by one (could be optimized with batch endpoint)
      for (const book of newBooks) {
        await addBookMutation.mutateAsync(book);
      }
      console.log(`Bulk uploaded ${newBooks.length} books to library`);
    } catch (error) {
      console.error("Failed to bulk upload books:", error);
    }
  };

  const handleStartReading = async (id: string) => {
    try {
      await updateBookMutation.mutateAsync({
        id,
        updates: { 
          isCurrentlyReading: true, 
          startedAt: new Date(),
        }
      });
    } catch (error) {
      console.error("Failed to start reading:", error);
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      await deleteBookMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to delete book:", error);
    }
  };

  const handleViewDetails = (id: string) => {
    console.log("View details for book:", id);
  };

  return (
    <div className="space-y-6" data-testid="page-library">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold">My Library</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? "Loading..." : `${books.length} books in your collection`}
          </p>
        </div>
        <div className="flex gap-2">
          <BulkUploadDialog onBulkUpload={handleBulkUpload} />
          <AddBookDialog onAddBook={handleAddBook} />
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search books or authors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-books"
          />
        </div>
        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
          <SelectTrigger className="w-48" data-testid="select-filter-genre">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            {BOOK_GENRES.map((genre) => (
              <SelectItem key={genre} value={genre}>
                {genre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading your library...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            Failed to load books. Please try refreshing the page.
          </div>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchTerm || selectedGenre !== "all" 
              ? "No books match your search criteria"
              : "No books in your library yet"
            }
          </div>
          {(!searchTerm && selectedGenre === "all") && (
            <AddBookDialog 
              onAddBook={handleAddBook}
              trigger={
                <Button className="mt-4" data-testid="button-add-first-book">
                  Add Your First Book
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="grid-books">
          {filteredBooks.map((book: Book) => (
            <BookCard
              key={book.id}
              {...book}
              onStartReading={handleStartReading}
              onViewDetails={handleViewDetails}
              onDelete={handleDeleteBook}
            />
          ))}
        </div>
      )}
    </div>
  );
}