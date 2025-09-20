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
import { Search, Filter } from "lucide-react";

// todo: remove mock functionality
const mockBooks = [
  {
    id: "1",
    title: "The Design of Everyday Things",
    author: "Don Norman",
    genre: "Design",
    usefulness: "Learning user experience principles and design thinking",
    totalPages: 368,
    currentPage: 0,
    isCurrentlyReading: false,
  },
  {
    id: "2",
    title: "Clean Code",
    author: "Robert C. Martin",
    genre: "Programming",
    usefulness: "Writing better, more maintainable code",
    totalPages: 464,
    currentPage: 125,
    isCurrentlyReading: true,
  },
  {
    id: "3",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    genre: "Psychology",
    usefulness: "Understanding cognitive biases and decision making",
    totalPages: 499,
    currentPage: 0,
    isCurrentlyReading: false,
  },
  {
    id: "4",
    title: "The Lean Startup",
    author: "Eric Ries",
    genre: "Business",
    usefulness: "Learning entrepreneurship and product development",
    totalPages: 336,
    currentPage: 89,
    isCurrentlyReading: true,
  },
  {
    id: "5",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    genre: "History",
    usefulness: "Understanding human civilization and evolution",
    totalPages: 512,
    currentPage: 0,
    isCurrentlyReading: false,
  },
];

export default function Library() {
  const [books, setBooks] = useState(mockBooks);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");

  const genres = Array.from(new Set(books.map(book => book.genre)));

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre === "all" || book.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const handleAddBook = (newBook: any) => {
    const book = {
      ...newBook,
      id: Date.now().toString(),
      currentPage: newBook.currentPage || 0,
    };
    setBooks(prev => [...prev, book]);
    console.log("Book added to library:", book);
  };

  const handleBulkUpload = (newBooks: any[]) => {
    const booksWithIds = newBooks.map(book => ({
      ...book,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      currentPage: book.currentPage || 0,
    }));
    setBooks(prev => [...prev, ...booksWithIds]);
    console.log(`Bulk uploaded ${booksWithIds.length} books to library`);
  };

  const handleStartReading = (id: string) => {
    setBooks(prev => prev.map(book => 
      book.id === id 
        ? { ...book, isCurrentlyReading: true, startedAt: new Date().toISOString() }
        : book
    ));
  };

  const handleDeleteBook = (id: string) => {
    setBooks(prev => prev.filter(book => book.id !== id));
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
            {books.length} books in your collection
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
            {genres.map((genre) => (
              <SelectItem key={genre} value={genre}>
                {genre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredBooks.length === 0 ? (
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
          {filteredBooks.map((book) => (
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