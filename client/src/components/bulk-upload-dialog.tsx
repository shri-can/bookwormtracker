import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from "lucide-react";

interface BulkUploadDialogProps {
  onBulkUpload?: (books: any[]) => void;
  trigger?: React.ReactNode;
}

const csvTemplate = `title,author,genre,usefulness,totalPages,isCurrentlyReading,currentPage
"Clean Code","Robert C. Martin","Programming","Writing better code",464,true,125
"The Design of Everyday Things","Don Norman","Design","Learning UX principles",368,false,0
"Atomic Habits","James Clear","Self-Help","Building better habits",320,true,89`;

export function BulkUploadDialog({ onBulkUpload, trigger }: BulkUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [validBooks, setValidBooks] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const requiredHeaders = ['title', 'author', 'genre'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const books = [];
    const parseErrors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const book: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          switch (header) {
            case 'title':
            case 'author':
            case 'genre':
            case 'usefulness':
              book[header] = value;
              break;
            case 'totalPages':
            case 'currentPage':
              book[header] = value ? parseInt(value) || 0 : 0;
              break;
            case 'isCurrentlyReading':
              book[header] = value.toLowerCase() === 'true';
              break;
          }
        });

        // Validate required fields
        if (!book.title || !book.author || !book.genre) {
          parseErrors.push(`Row ${i + 1}: Missing required fields (title, author, genre)`);
          continue;
        }

        books.push(book);
      } catch (error) {
        parseErrors.push(`Row ${i + 1}: ${error}`);
      }
    }

    return { books, errors: parseErrors };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(csv|txt)$/i)) {
      setErrors(['Please upload a CSV file (.csv or .txt)']);
      return;
    }

    setIsProcessing(true);
    setProgress(20);
    setErrors([]);
    setValidBooks([]);

    try {
      const text = await file.text();
      setProgress(60);
      
      const { books, errors: parseErrors } = parseCSV(text);
      setProgress(80);
      
      setValidBooks(books);
      setErrors(parseErrors);
      setShowPreview(true);
      setProgress(100);
      
      console.log(`Parsed ${books.length} books from CSV with ${parseErrors.length} errors`);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to parse CSV file']);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleImport = () => {
    if (validBooks.length > 0) {
      onBulkUpload?.(validBooks);
      setIsOpen(false);
      setShowPreview(false);
      setValidBooks([]);
      setErrors([]);
      console.log(`Imported ${validBooks.length} books via bulk upload`);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Downloaded CSV template");
  };

  const resetDialog = () => {
    setShowPreview(false);
    setValidBooks([]);
    setErrors([]);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const defaultTrigger = (
    <Button variant="outline" data-testid="button-bulk-upload">
      <Upload className="mr-2 h-4 w-4" />
      Bulk Upload
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" data-testid="dialog-bulk-upload">
        <DialogHeader>
          <DialogTitle>Bulk Import Books</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple books at once. Download the template to get started.
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                data-testid="button-download-template"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <span className="text-sm text-muted-foreground">
                Use this template to format your data correctly
              </span>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Upload your CSV file</p>
                <p className="text-xs text-muted-foreground">
                  Supported format: .csv files with headers
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-csv-file"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  data-testid="button-select-file"
                >
                  {isProcessing ? "Processing..." : "Select CSV File"}
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing file...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-upload" />
              </div>
            )}

            {errors.length > 0 && !showPreview && (
              <Alert variant="destructive" data-testid="alert-upload-errors">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Upload failed:</p>
                    {errors.slice(0, 3).map((error, index) => (
                      <p key={index} className="text-sm">{error}</p>
                    ))}
                    {errors.length > 3 && (
                      <p className="text-sm">...and {errors.length - 3} more errors</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">File processed successfully</span>
              </div>
              <Button variant="outline" onClick={resetDialog} data-testid="button-upload-different">
                Upload Different File
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600" data-testid="text-valid-books">
                  {validBooks.length}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Valid Books
                </div>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-2xl font-bold text-red-600" data-testid="text-error-count">
                  {errors.length}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  Errors
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive" data-testid="alert-preview-errors">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Some rows had errors:</p>
                    {errors.slice(0, 3).map((error, index) => (
                      <p key={index} className="text-sm">{error}</p>
                    ))}
                    {errors.length > 3 && (
                      <p className="text-sm">...and {errors.length - 3} more errors</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validBooks.length > 0 && (
              <div className="space-y-2" data-testid="preview-books">
                <p className="font-medium">Books to import:</p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {validBooks.slice(0, 5).map((book, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{book.title}</div>
                        <div className="text-xs text-muted-foreground">
                          by {book.author} • {book.genre}
                        </div>
                      </div>
                      {book.isCurrentlyReading && (
                        <Badge variant="outline" className="text-xs">Reading</Badge>
                      )}
                    </div>
                  ))}
                  {validBooks.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ...and {validBooks.length - 5} more books
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {showPreview ? (
            <Button 
              onClick={handleImport}
              disabled={validBooks.length === 0}
              data-testid="button-import-books"
            >
              Import {validBooks.length} Books
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Upload a CSV file to continue
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}