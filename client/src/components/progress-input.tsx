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
  const [startPage, setStartPage] = useState(book.currentPage || 0);
  const [endPage, setEndPage] = useState(book.currentPage || 0);

  const handleEndPageChip = (increment: number) => {
    const newPage = Math.max(startPage, endPage + increment);
    const maxPage = book.totalPages || 999999;
    const finalPage = Math.min(newPage, maxPage);
    setEndPage(finalPage);
  };

  const handleStartPageChange = (value: string) => {
    const newPage = parseInt(value) || 0;
    const maxPage = book.totalPages || 999999;
    const finalPage = Math.max(0, Math.min(newPage, maxPage));
    setStartPage(finalPage);
    // Auto-adjust end page if it's now less than start page
    if (endPage < finalPage) {
      setEndPage(finalPage);
    }
  };

  const handleEndPageChange = (value: string) => {
    const newPage = parseInt(value) || 0;
    const maxPage = book.totalPages || 999999;
    const finalPage = Math.max(startPage, Math.min(newPage, maxPage));
    setEndPage(finalPage);
  };

  const handleConfirm = () => {
    onConfirm(endPage);
  };

  const pagesRead = Math.max(0, endPage - startPage);

  return (
    <Card className="border-dashed" data-testid="card-progress-input">
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <h4 className="font-medium mb-1">Session Progress</h4>
          <p className="text-sm text-muted-foreground">
            What pages did you read in this session?
          </p>
        </div>

        {/* Start Page Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Start Page</label>
          <div className="flex items-center justify-center space-x-3">
            <Input
              type="number"
              value={startPage}
              onChange={(e) => handleStartPageChange(e.target.value)}
              className="w-20 text-center"
              min={0}
              max={book.totalPages || undefined}
              data-testid="input-start-page"
            />
            {book.totalPages && (
              <span className="text-sm text-muted-foreground">
                of {book.totalPages}
              </span>
            )}
          </div>
        </div>

        {/* End Page Input with Chips */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">End Page</label>
          
          {/* Quick Page Chips */}
          <div className="flex justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEndPageChip(-5)}
              disabled={endPage <= startPage}
              data-testid="button-minus-5"
            >
              <Minus className="h-3 w-3 mr-1" />
              5
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEndPageChip(5)}
              data-testid="button-plus-5"
            >
              <Plus className="h-3 w-3 mr-1" />
              5
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEndPageChip(10)}
              data-testid="button-plus-10"
            >
              <Plus className="h-3 w-3 mr-1" />
              10
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEndPageChip(25)}
              data-testid="button-plus-25"
            >
              <Plus className="h-3 w-3 mr-1" />
              25
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-3">
            <Input
              type="number"
              value={endPage}
              onChange={(e) => handleEndPageChange(e.target.value)}
              className="w-20 text-center"
              min={startPage}
              max={book.totalPages || undefined}
              data-testid="input-end-page"
            />
            {book.totalPages && (
              <span className="text-sm text-muted-foreground">
                of {book.totalPages}
              </span>
            )}
          </div>
        </div>

        {/* Pages Read Summary */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground">
            Pages read: <span className="font-medium text-foreground">{pagesRead}</span>
          </div>
          {book.totalPages && (
            <div className="text-xs text-muted-foreground">
              {Math.round((endPage / book.totalPages) * 100)}% complete
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