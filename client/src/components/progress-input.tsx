import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus } from 'lucide-react';
import type { Book } from '@shared/schema';

interface ProgressInputProps {
  book: Book;
  onPageUpdate: (newPage: number) => void;
  onCancel: () => void;
  onConfirm: (endPage: number) => void;
  isLoading?: boolean;
}

export function ProgressInput({ book, onPageUpdate, onCancel, onConfirm, isLoading }: ProgressInputProps) {
  const [currentPage, setCurrentPage] = useState(book.currentPage || 0);

  const handlePageChip = (increment: number) => {
    const newPage = Math.max(0, currentPage + increment);
    const maxPage = book.totalPages || 999999;
    const finalPage = Math.min(newPage, maxPage);
    setCurrentPage(finalPage);
  };

  const handleInputChange = (value: string) => {
    const newPage = parseInt(value) || 0;
    const maxPage = book.totalPages || 999999;
    const finalPage = Math.max(0, Math.min(newPage, maxPage));
    setCurrentPage(finalPage);
  };

  const handleConfirm = () => {
    onConfirm(currentPage);
  };

  return (
    <Card className="border-dashed" data-testid="card-progress-input">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <h4 className="font-medium mb-1">Update Your Progress</h4>
          <p className="text-sm text-muted-foreground">
            What page did you finish on?
          </p>
        </div>

        {/* Quick Page Chips */}
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChip(-5)}
            disabled={currentPage <= 0}
            data-testid="button-minus-5"
          >
            <Minus className="h-3 w-3 mr-1" />
            5
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChip(5)}
            data-testid="button-plus-5"
          >
            <Plus className="h-3 w-3 mr-1" />
            5
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChip(10)}
            data-testid="button-plus-10"
          >
            <Plus className="h-3 w-3 mr-1" />
            10
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChip(25)}
            data-testid="button-plus-25"
          >
            <Plus className="h-3 w-3 mr-1" />
            25
          </Button>
        </div>

        {/* Current Page Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-3">
            <span className="text-sm text-muted-foreground">Page:</span>
            <Input
              type="number"
              value={currentPage}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-20 text-center"
              min={0}
              max={book.totalPages || undefined}
              data-testid="input-current-page"
            />
            {book.totalPages && (
              <span className="text-sm text-muted-foreground">
                of {book.totalPages}
              </span>
            )}
          </div>
          {book.totalPages && (
            <div className="text-xs text-center text-muted-foreground">
              {Math.round((currentPage / book.totalPages) * 100)}% complete
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
            data-testid="button-cancel-progress"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
            data-testid="button-confirm-progress"
          >
            {isLoading ? 'Stopping...' : 'Stop Session'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}