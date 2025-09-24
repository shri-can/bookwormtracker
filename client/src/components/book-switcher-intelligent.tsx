import React, { useState } from "react";
import { Book } from "../../../shared/schema";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent } from "./ui/card";
import { BookOpen, Plus, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

interface BookSwitcherProps {
  books: Book[];
  activeId?: string;
  onSwitch: (book: Book) => void;
  onAdd: () => void;
}

const getProgressPercentage = (book: Book): number => {
  if (!book.totalPages || book.totalPages === 0) return 0;
  const currentPage = book.currentPage || 0;
  return Math.round((currentPage / book.totalPages) * 100);
};

// Layout 1: Segmented Pills (≤3 books)
const SegmentedPillsLayout: React.FC<{
  books: Book[];
  activeId?: string;
  onSwitch: (book: Book) => void;
  onAdd: () => void;
}> = ({ books, activeId, onSwitch, onAdd }) => {
  return (
    <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
      {books.map((book) => {
        const isActive = activeId === book.id;
        const progress = getProgressPercentage(book);
        
        return (
          <Button
            key={book.id}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-10 px-3 flex-1 justify-start min-w-0",
              isActive && "shadow-sm"
            )}
            onClick={() => onSwitch(book)}
            aria-pressed={isActive}
            data-testid={`pill-book-${book.id}`}
          >
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              {/* Small book cover */}
              <div className="w-6 h-8 bg-background rounded flex items-center justify-center flex-shrink-0">
                {book.coverUrl ? (
                  <img 
                    src={book.coverUrl} 
                    alt={book.title}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <BookOpen className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              
              {/* Book info */}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{book.title}</div>
                <div className="w-full bg-muted-foreground/20 rounded-full h-1 mt-1">
                  <div 
                    className="bg-current h-1 rounded-full transition-all" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </Button>
        );
      })}
      
      {/* Add button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0 flex-shrink-0"
        onClick={onAdd}
        data-testid="pill-add-book"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Layout 2: Horizontal Chip Bar (4-5 books)
const ChipBarLayout: React.FC<{
  books: Book[];
  activeId?: string;
  onSwitch: (book: Book) => void;
  onAdd: () => void;
}> = ({ books, activeId, onSwitch, onAdd }) => {
  return (
    <div className="flex items-center space-x-2">
      <ScrollArea className="flex-1">
        <div className="flex space-x-2 pb-1">
          {books.map((book) => {
            const isActive = activeId === book.id;
            const progress = getProgressPercentage(book);
            
            return (
              <Card
                key={book.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-sm min-w-[100px]",
                  isActive 
                    ? "ring-2 ring-primary bg-primary/5" 
                    : "hover:bg-muted/50"
                )}
                onClick={() => onSwitch(book)}
                data-testid={`chip-book-${book.id}`}
              >
                <CardContent className="p-2">
                  <div className="flex items-center space-x-2">
                    {/* Book cover */}
                    <div className="w-6 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      {book.coverUrl ? (
                        <img 
                          src={book.coverUrl} 
                          alt={book.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <BookOpen className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Book info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{book.title}</div>
                      <div className="text-xs text-muted-foreground">{progress}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Add button */}
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0 flex-shrink-0"
        onClick={onAdd}
        data-testid="chip-add-book"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Layout 3: Single Active Chip + Bottom Sheet (>5 books)
const BottomSheetLayout: React.FC<{
  books: Book[];
  activeId?: string;
  onSwitch: (book: Book) => void;
  onAdd: () => void;
}> = ({ books, activeId, onSwitch, onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeBook = books.find(book => book.id === activeId);
  const progress = activeBook ? getProgressPercentage(activeBook) : 0;
  
  return (
    <div className="flex items-center space-x-2">
      {/* Active book chip */}
      <Card className="flex-1 cursor-pointer hover:shadow-sm">
        <CardContent className="p-2">
          <div className="flex items-center space-x-2">
            {/* Book cover */}
            <div className="w-6 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
              {activeBook?.coverUrl ? (
                <img 
                  src={activeBook.coverUrl} 
                  alt={activeBook.title}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <BookOpen className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            
            {/* Book info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {activeBook?.title || "Select a book"}
              </div>
              <div className="text-xs text-muted-foreground">{progress}% complete</div>
            </div>
            
            {/* Chevron */}
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
      
      {/* Add button */}
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0 flex-shrink-0"
        onClick={onAdd}
        data-testid="sheet-add-book"
      >
        <Plus className="h-4 w-4" />
      </Button>
      
      {/* Bottom sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <div className="absolute inset-0" />
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[400px]">
          <SheetHeader>
            <SheetTitle>Switch Book ({books.length} active)</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="mt-4">
            <div className="space-y-2">
              {books.map((book) => {
                const isActive = activeId === book.id;
                const bookProgress = getProgressPercentage(book);
                
                return (
                  <Card
                    key={book.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-sm",
                      isActive && "ring-2 ring-primary bg-primary/5"
                    )}
                    onClick={() => {
                      onSwitch(book);
                      setIsOpen(false);
                    }}
                    data-testid={`sheet-book-${book.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        {/* Book cover */}
                        <div className="w-10 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          {book.coverUrl ? (
                            <img 
                              src={book.coverUrl} 
                              alt={book.title}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <BookOpen className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* Book info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{book.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            by {book.author}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              {bookProgress}% complete
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {book.currentPage || 0}/{book.totalPages || '?'} pages
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export const BookSwitcher: React.FC<BookSwitcherProps> = ({
  books,
  activeId,
  onSwitch,
  onAdd
}) => {
  // Choose layout based on number of books
  if (books.length <= 3) {
    return <SegmentedPillsLayout books={books} activeId={activeId} onSwitch={onSwitch} onAdd={onAdd} />;
  } else if (books.length <= 5) {
    return <ChipBarLayout books={books} activeId={activeId} onSwitch={onSwitch} onAdd={onAdd} />;
  } else {
    return <BottomSheetLayout books={books} activeId={activeId} onSwitch={onSwitch} onAdd={onAdd} />;
  }
};
