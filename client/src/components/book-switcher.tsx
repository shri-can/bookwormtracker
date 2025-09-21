import { useState } from 'react';
import { ChevronDown, BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { getProgressPercentage } from '@/lib/progressUtils';
import type { Book } from '@shared/schema';

interface BookSwitcherProps {
  selectedBook: Book | null;
  onBookSelect: (book: Book) => void;
  onAddNewBook?: () => void;
  currentlyReadingBooks: Book[];
}

export function BookSwitcher({ selectedBook, onBookSelect, onAddNewBook, currentlyReadingBooks }: BookSwitcherProps) {

  if (currentlyReadingBooks.length === 0) {
    return (
      <Card data-testid="card-no-books-reading">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No books currently reading</h3>
          <p className="text-muted-foreground mb-4">
            Start reading a book to track your progress with session management
          </p>
          {onAddNewBook && (
            <Button onClick={onAddNewBook} data-testid="button-add-first-book">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Book
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Currently Reading</h2>
        <Badge variant="outline" data-testid="badge-books-count">
          {currentlyReadingBooks.length} book{currentlyReadingBooks.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-auto p-4"
            data-testid="button-book-switcher"
          >
            {selectedBook ? (
              <div className="flex flex-col items-start space-y-1">
                <div className="font-medium">{selectedBook.title}</div>
                <div className="text-sm text-muted-foreground">
                  by {selectedBook.author} • {getProgressPercentage(selectedBook)}% complete
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Select a book to read</span>
              </div>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80" align="start">
          {currentlyReadingBooks.map((book) => (
            <DropdownMenuItem
              key={book.id}
              onClick={() => onBookSelect(book)}
              className="p-3 h-auto"
              data-testid={`menu-item-book-${book.id}`}
            >
              <div className="flex flex-col space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{book.title}</span>
                  {selectedBook?.id === book.id && (
                    <Badge variant="default" className="ml-2">Current</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  by {book.author}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{book.genre}</span>
                  <span>{getProgressPercentage(book)}% complete</span>
                </div>
                {book.currentPage && book.totalPages && (
                  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-accent h-1.5 rounded-full transition-all" 
                      style={{ width: `${getProgressPercentage(book)}%` }}
                    />
                  </div>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          {onAddNewBook && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onAddNewBook} data-testid="menu-item-add-book">
                <Plus className="h-4 w-4 mr-2" />
                Add New Book
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}