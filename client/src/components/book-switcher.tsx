import { useState } from 'react';
import { BookOpen, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      {/* Book Count Badge */}
      <div className="flex justify-end">
        <Badge variant="outline" data-testid="badge-books-count">
          {currentlyReadingBooks.length} book{currentlyReadingBooks.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* Horizontal Book Chips */}
      <ScrollArea className="w-full">
        <div className="flex space-x-2 pb-1">
          {currentlyReadingBooks.map((book) => {
            const isSelected = selectedBook?.id === book.id;
            const progress = getProgressPercentage(book);
            
            return (
              <Card
                key={book.id}
                className={`cursor-pointer transition-all hover:shadow-sm min-w-[120px] ${
                  isSelected 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onBookSelect(book)}
                data-testid={`chip-book-${book.id}`}
              >
                <CardContent className="p-2">
                  <div className="flex items-center space-x-2">
                    {/* Book Cover Placeholder */}
                    <div className="w-8 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      {book.coverUrl ? (
                        <img 
                          src={book.coverUrl} 
                          alt={book.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-xs truncate">{book.title}</h3>
                        {isSelected && (
                          <Check className="h-3 w-3 text-primary flex-shrink-0 ml-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {book.author}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="mt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{progress}%</span>
                          <span className="font-medium">{book.currentPage || 0}/{book.totalPages || '?'}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1">
                          <div 
                            className="bg-primary h-1 rounded-full transition-all" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {book.currentPage && book.totalPages && (
                          <div className="text-xs text-muted-foreground">
                            {book.currentPage} of {book.totalPages} pages
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Add New Book Chip */}
          {onAddNewBook && (
            <Card
              className="cursor-pointer transition-all hover:shadow-sm min-w-[120px] border-dashed hover:bg-muted/50"
              onClick={onAddNewBook}
              data-testid="chip-add-book"
            >
              <CardContent className="p-2 flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-10 bg-muted rounded flex items-center justify-center mx-auto mb-1">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-xs font-medium">Add Book</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}