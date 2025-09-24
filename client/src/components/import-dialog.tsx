import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, AlertCircle, CheckCircle, X, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImportDialogProps {
  children: React.ReactNode;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicates: number;
  preview?: any[];
}

interface ImportOptions {
  skipDuplicates: boolean;
  updateExisting: boolean;
  preserveProgress: boolean;
}

const csvTemplate = `Book Title,Author,Medium,Type,Topic,How It Might Help Me,Total Pages,Current Page,Date Added,Reading Start Date,Completion Date,Status,Priority
"Clean Code","Robert C. Martin","paper","Programming","programming;clean-code","Writing better code",464,0,2024-01-15,2024-01-20,2024-02-15,finished,4
"The Design of Everyday Things","Don Norman","paper","Design","design;ux;psychology","Learning UX principles",368,0,2024-01-10,,,toRead,3`;

export function ImportDialog({ children }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [options, setOptions] = useState<ImportOptions>({
    skipDuplicates: true,
    updateExisting: false,
    preserveProgress: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const books = [];

    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const book: any = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        const cleanValue = value.replace(/^"|"$/g, '').replace(/""/g, '"');
        
        switch (header.toLowerCase()) {
          case 'book title':
          case 'title':
            book.title = cleanValue;
            break;
          case 'author':
            book.author = cleanValue;
            break;
          case 'medium':
          case 'format':
            book.format = cleanValue || 'paper';
            break;
          case 'type':
          case 'genre':
            book.genre = cleanValue || 'General Non-Fiction';
            break;
          case 'topic':
          case 'topics':
            book.topics = cleanValue ? cleanValue.split(';').map((t: string) => t.trim()).filter(Boolean) : [];
            break;
          case 'how it might help me':
          case 'usefulness':
            book.usefulness = cleanValue;
            break;
          case 'date added':
          case 'addedat':
            // This will be handled by the server as addedAt
            break;
          case 'reading start date':
          case 'startedat':
            book.startedAt = cleanValue ? new Date(cleanValue).toISOString() : undefined;
            break;
          case 'completion date':
          case 'completedat':
            book.completedAt = cleanValue ? new Date(cleanValue).toISOString() : undefined;
            break;
          case 'status':
            book.status = cleanValue || 'toRead';
            break;
          case 'priority':
            book.priority = parseInt(cleanValue) || 3;
            break;
          // Legacy field mappings for backward compatibility
          case 'total pages':
          case 'totalpages':
            book.totalPages = parseInt(cleanValue) || 0;
            break;
          case 'is currently reading':
          case 'iscurrentlyreading':
            book.isCurrentlyReading = cleanValue.toLowerCase() === 'true';
            break;
          case 'current page':
          case 'currentpage':
            book.currentPage = parseInt(cleanValue) || 0;
            break;
          case 'progress':
            const progressStr = cleanValue.replace('%', '');
            book.progress = parseFloat(progressStr) / 100 || 0;
            break;
          case 'language':
            book.language = cleanValue || 'English';
            break;
          case 'tags':
            book.tags = cleanValue ? cleanValue.split(';').map((t: string) => t.trim()).filter(Boolean) : [];
            break;
          case 'notes':
            book.notes = cleanValue ? cleanValue.split(';').map((n: string) => n.trim()).filter(Boolean) : [];
            break;
        }
      });

      if (book.title && book.author) {
        books.push(book);
      }
    }

    return books;
  };

  const parseJSON = (text: string): any[] => {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        return data;
      } else if (data.books && Array.isArray(data.books)) {
        return data.books;
      }
      return [];
    } catch {
      return [];
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    try {
      const text = await selectedFile.text();
      let parsedBooks: any[] = [];

      if (selectedFile.name.endsWith('.csv')) {
        parsedBooks = parseCSV(text);
      } else if (selectedFile.name.endsWith('.json')) {
        parsedBooks = parseJSON(text);
      }

      setPreview(parsedBooks.slice(0, 5)); // Show first 5 books as preview
    } catch (error) {
      toast({
        title: "File parsing failed",
        description: "Unable to read the selected file",
        variant: "destructive",
      });
      setFile(null);
      setPreview(null);
    }
  };

  const importMutation = useMutation({
    mutationFn: async (books: any[]) => {
      const response = await apiRequest('POST', '/api/books/import', {
        books,
        options,
      });
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      
      if (result.success) {
        toast({
          title: "Import successful",
          description: `${result.imported} books imported successfully`,
        });
      } else {
        toast({
          title: "Import completed with errors",
          description: `${result.imported} books imported, ${result.errors.length} errors`,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Import failed",
        description: "An error occurred during import",
        variant: "destructive",
      });
    },
  });

  const handleImport = async () => {
    if (!file || !preview) return;

    setImporting(true);
    try {
      const text = await file.text();
      let books: any[] = [];

      if (file.name.endsWith('.csv')) {
        books = parseCSV(text);
      } else if (file.name.endsWith('.json')) {
        books = parseJSON(text);
      }

      await importMutation.mutateAsync(books);
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setImporting(false);
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
    toast({
      title: "Template downloaded",
      description: "CSV template saved to your downloads",
    });
  };

  const resetDialog = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetDialog();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-import">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Books
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          {!file && (
            <div>
              <Label htmlFor="file-upload" className="text-base font-medium">
                Select File
              </Label>
              <div className="mt-2">
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  data-testid="input-file-upload"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: CSV, JSON
              </p>
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadTemplate}
                  data-testid="button-download-template"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the template to format your CSV file correctly
                </p>
              </div>
            </div>
          )}

          {/* File Info & Preview */}
          {file && preview && !importResult && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {file.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetDialog}
                      data-testid="button-clear-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <span className="ml-2 font-medium">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 font-medium">{file.type || 'text/plain'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Books found:</span>
                      <span className="ml-2 font-medium">{preview.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <div>
                <Label className="text-base font-medium">Preview (First 5 Books)</Label>
                <div className="mt-2 space-y-2">
                  {preview.slice(0, 5).map((book, index) => (
                    <Card key={index} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{book.title}</div>
                            <div className="text-sm text-muted-foreground">
                              by {book.author} • {book.genre}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Badge variant="outline">{book.status}</Badge>
                            <Badge variant="outline">{book.format}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Import Options */}
              <div>
                <Label className="text-base font-medium">Import Options</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skip-duplicates"
                      checked={options.skipDuplicates}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, skipDuplicates: !!checked }))}
                      data-testid="checkbox-skip-duplicates"
                    />
                    <Label htmlFor="skip-duplicates" className="text-sm">
                      Skip duplicate books (same title + author)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="update-existing"
                      checked={options.updateExisting}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, updateExisting: !!checked }))}
                      data-testid="checkbox-update-existing"
                    />
                    <Label htmlFor="update-existing" className="text-sm">
                      Update existing books with new data
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preserve-progress"
                      checked={options.preserveProgress}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, preserveProgress: !!checked }))}
                      data-testid="checkbox-preserve-progress"
                    />
                    <Label htmlFor="preserve-progress" className="text-sm">
                      Preserve existing reading progress
                    </Label>
                  </div>
                </div>
              </div>

              {/* Import Button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetDialog} data-testid="button-cancel-import">
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={importing || preview.length === 0}
                  data-testid="button-start-import"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {preview.length} Books
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Successfully imported:</span>
                    <span className="ml-2 font-medium text-green-600">{importResult.imported}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duplicates skipped:</span>
                    <span className="ml-2 font-medium text-blue-600">{importResult.duplicates || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>
                    <span className="ml-2 font-medium text-red-600">{importResult.errors.length}</span>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-red-600">Errors:</Label>
                    <div className="mt-1 text-xs space-y-1">
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                      {importResult.errors.length > 5 && (
                        <div className="text-muted-foreground">
                          ... and {importResult.errors.length - 5} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setOpen(false)} data-testid="button-close-results">
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}