import { useState } from "react";
import { ReadingProgress } from "@/components/reading-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Target } from "lucide-react";

// todo: remove mock functionality
const mockCurrentlyReading = [
  {
    id: "1",
    title: "Clean Code",
    author: "Robert C. Martin",
    genre: "Programming",
    totalPages: 464,
    currentPage: 125,
    startedAt: "2024-01-10",
    isCurrentlyReading: true,
  },
  {
    id: "2", 
    title: "The Lean Startup",
    author: "Eric Ries",
    genre: "Business",
    totalPages: 336,
    currentPage: 89,
    startedAt: "2024-01-05",
    isCurrentlyReading: true,
  },
  {
    id: "3",
    title: "Atomic Habits",
    author: "James Clear",
    genre: "Self-Help",
    totalPages: 320,
    currentPage: 187,
    startedAt: "2024-01-15",
    isCurrentlyReading: true,
  },
];

export default function CurrentlyReading() {
  const [books, setBooks] = useState(mockCurrentlyReading);

  const handleUpdateProgress = (id: string, newPage: number) => {
    setBooks(prev => prev.map(book => 
      book.id === id ? { ...book, currentPage: newPage } : book
    ));
    console.log(`Updated progress for book ${id} to page ${newPage}`);
  };

  const totalPages = books.reduce((sum, book) => sum + book.totalPages, 0);
  const totalReadPages = books.reduce((sum, book) => sum + book.currentPage, 0);
  const overallProgress = totalPages > 0 ? (totalReadPages / totalPages) * 100 : 0;

  const totalDaysReading = books.reduce((sum, book) => {
    const days = Math.floor((new Date().getTime() - new Date(book.startedAt).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return sum + days;
  }, 0);

  const averagePagesPerDay = totalDaysReading > 0 ? totalReadPages / totalDaysReading : 0;

  return (
    <div className="space-y-6" data-testid="page-currently-reading">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Currently Reading</h1>
        <p className="text-muted-foreground mt-1">
          Track your progress on {books.length} active books
        </p>
      </div>

      {books.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No books currently being read</h3>
            <p className="text-muted-foreground">
              Start reading a book from your library to track your progress here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-overall-stats">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-overall-progress">
                  {Math.round(overallProgress)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalReadPages} of {totalPages} pages
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-books-reading">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Books Reading</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-books-count">
                  {books.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active reading sessions
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-reading-pace">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Pace</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-average-pace">
                  {averagePagesPerDay.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pages per day
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Your Reading Progress</h2>
              <Badge variant="outline">{books.length} books</Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="grid-reading-progress">
              {books.map((book) => (
                <ReadingProgress
                  key={book.id}
                  {...book}
                  onUpdateProgress={handleUpdateProgress}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}