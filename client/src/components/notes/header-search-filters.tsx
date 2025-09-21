import { useState } from 'react';
import { Search, X, Filter, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import type { Book } from '@shared/schema';

interface FilterState {
  books: string[];
  types: string[];
  tags: string[];
  hasImage: boolean | null;
  dateRange: string | null;
}

interface HeaderSearchFiltersProps {
  searchTerm: string;
  onSearchChange: (search: string) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onQuickCaptureOpen: () => void;
  availableBooks: Book[];
  availableTags: string[];
  noteCount: number;
}

const NOTE_TYPES = [
  { id: 'note', label: 'Note' },
  { id: 'quote', label: 'Quote' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'summary', label: 'Summary' },
  { id: 'action', label: 'Action' },
];

const DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'custom', label: 'Custom' },
];

export function HeaderSearchFilters({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  onQuickCaptureOpen,
  availableBooks,
  availableTags,
  noteCount,
}: HeaderSearchFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = 
    filters.books.length + 
    filters.types.length + 
    filters.tags.length + 
    (filters.hasImage !== null ? 1 : 0) + 
    (filters.dateRange ? 1 : 0);

  const clearAllFilters = () => {
    onFiltersChange({
      books: [],
      types: [],
      tags: [],
      hasImage: null,
      dateRange: null,
    });
  };

  const toggleBookFilter = (bookId: string) => {
    const newBooks = filters.books.includes(bookId)
      ? filters.books.filter(id => id !== bookId)
      : [...filters.books, bookId];
    onFiltersChange({ ...filters, books: newBooks });
  };

  const toggleTypeFilter = (typeId: string) => {
    const newTypes = filters.types.includes(typeId)
      ? filters.types.filter(id => id !== typeId)
      : [...filters.types, typeId];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const toggleTagFilter = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const removeFilter = (type: string, value: string) => {
    switch (type) {
      case 'book':
        toggleBookFilter(value);
        break;
      case 'type':
        toggleTypeFilter(value);
        break;
      case 'tag':
        toggleTagFilter(value);
        break;
      case 'hasImage':
        onFiltersChange({ ...filters, hasImage: null });
        break;
      case 'dateRange':
        onFiltersChange({ ...filters, dateRange: null });
        break;
    }
  };

  const getBookTitle = (bookId: string) => {
    const book = availableBooks.find(b => b.id === bookId);
    return book?.title || 'Unknown Book';
  };

  const recentBooks = availableBooks.slice(0, 5);
  const frequentTags = availableTags.slice(0, 10);

  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      <div className="p-4 space-y-4">
        {/* Header with search and add button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search notes, quotes, tags"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-10"
              data-testid="input-search-notes"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => onSearchChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button onClick={onQuickCaptureOpen} data-testid="button-quick-capture">
            +
          </Button>
        </div>

        {/* Filter chips and controls */}
        <div className="flex items-center gap-2">
          <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-filters">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="start">
              {/* Books Filter */}
              <DropdownMenuLabel>Books (Recent 5)</DropdownMenuLabel>
              {recentBooks.map(book => (
                <DropdownMenuCheckboxItem
                  key={book.id}
                  checked={filters.books.includes(book.id)}
                  onCheckedChange={() => toggleBookFilter(book.id)}
                  data-testid={`filter-book-${book.id}`}
                >
                  {book.title}
                </DropdownMenuCheckboxItem>
              ))}
              {availableBooks.length > 5 && (
                <DropdownMenuItem className="text-xs text-muted-foreground">
                  All... (showing recent 5)
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Note Types Filter */}
              <DropdownMenuLabel>Type</DropdownMenuLabel>
              {NOTE_TYPES.map(type => (
                <DropdownMenuCheckboxItem
                  key={type.id}
                  checked={filters.types.includes(type.id)}
                  onCheckedChange={() => toggleTypeFilter(type.id)}
                  data-testid={`filter-type-${type.id}`}
                >
                  {type.label}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />

              {/* Tags Filter */}
              <DropdownMenuLabel>Tags (Top 10)</DropdownMenuLabel>
              {frequentTags.map(tag => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={filters.tags.includes(tag)}
                  onCheckedChange={() => toggleTagFilter(tag)}
                  data-testid={`filter-tag-${tag}`}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))}
              {availableTags.length > 10 && (
                <DropdownMenuItem className="text-xs text-muted-foreground">
                  All... (showing top 10)
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Has Image Filter */}
              <DropdownMenuCheckboxItem
                checked={filters.hasImage === true}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, hasImage: checked ? true : null })
                }
                data-testid="filter-has-image"
              >
                Has image
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />

              {/* Date Range Filter */}
              <DropdownMenuLabel>Date</DropdownMenuLabel>
              {DATE_RANGES.map(range => (
                <DropdownMenuCheckboxItem
                  key={range.id}
                  checked={filters.dateRange === range.id}
                  onCheckedChange={(checked) => 
                    onFiltersChange({ ...filters, dateRange: checked ? range.id : null })
                  }
                  data-testid={`filter-date-${range.id}`}
                >
                  {range.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              data-testid="button-clear-filters"
            >
              Clear all
            </Button>
          )}

          <div className="text-sm text-muted-foreground">
            {noteCount} note{noteCount === 1 ? '' : 's'}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {filters.books.map(bookId => (
                <Badge
                  key={bookId}
                  variant="secondary"
                  className="flex items-center gap-1"
                  data-testid={`chip-book-${bookId}`}
                >
                  {getBookTitle(bookId)}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter('book', bookId)}
                  />
                </Badge>
              ))}
              {filters.types.map(type => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="flex items-center gap-1"
                  data-testid={`chip-type-${type}`}
                >
                  {NOTE_TYPES.find(t => t.id === type)?.label || type}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter('type', type)}
                  />
                </Badge>
              ))}
              {filters.tags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1"
                  data-testid={`chip-tag-${tag}`}
                >
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter('tag', tag)}
                  />
                </Badge>
              ))}
              {filters.hasImage && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1"
                  data-testid="chip-has-image"
                >
                  Has image
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter('hasImage', '')}
                  />
                </Badge>
              )}
              {filters.dateRange && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1"
                  data-testid={`chip-date-${filters.dateRange}`}
                >
                  {DATE_RANGES.find(d => d.id === filters.dateRange)?.label || filters.dateRange}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter('dateRange', '')}
                  />
                </Badge>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}