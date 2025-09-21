import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Book } from "@shared/schema";

interface ExportDialogProps {
  children: React.ReactNode;
}

interface ExportOptions {
  includeNotes: boolean;
  includeTags: boolean;
  includeProgress: boolean;
  includeReadingSessions: boolean;
  format: 'csv' | 'json';
  statusFilter: string[];
}

export function ExportDialog({ children }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  
  const [options, setOptions] = useState<ExportOptions>({
    includeNotes: true,
    includeTags: true,
    includeProgress: true,
    includeReadingSessions: false,
    format: 'csv',
    statusFilter: ['toRead', 'reading', 'onHold', 'finished', 'dnf'],
  });

  const { data: books = [] } = useQuery<Book[]>({
    queryKey: ['/api/books'],
    queryFn: async () => {
      const response = await fetch('/api/books');
      if (!response.ok) throw new Error('Failed to fetch books');
      return response.json();
    },
  });

  const filteredBooks = books.filter(book => 
    options.statusFilter.includes(book.status)
  );

  const exportData = async () => {
    setExporting(true);
    try {
      if (options.format === 'csv') {
        await exportCSV();
      } else {
        await exportJSON();
      }
      
      toast({
        title: "Export successful",
        description: `${filteredBooks.length} books exported successfully`,
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Export failed",
        description: "An error occurred while exporting your books",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = async () => {
    const headers = [
      'Title',
      'Author',
      'Genre',
      'Status',
      'Priority',
      'Format',
      'Total Pages',
      'Current Page',
      'Progress',
      'Language',
      'Added Date',
      'Started Date',
      'Completed Date',
      'Last Read Date',
      ...(options.includeTags ? ['Tags'] : []),
      ...(options.includeNotes ? ['Notes'] : []),
    ];

    const rows = filteredBooks.map(book => {
      const row = [
        book.title || '',
        book.author || '',
        book.genre || '',
        book.status || '',
        book.priority?.toString() || '',
        book.format || '',
        book.totalPages?.toString() || '',
        book.currentPage?.toString() || '',
        `${Math.round((book.progress || 0) * 100)}%`,
        book.language || '',
        book.addedAt ? new Date(book.addedAt).toISOString().split('T')[0] : '',
        book.startedAt ? new Date(book.startedAt).toISOString().split('T')[0] : '',
        book.completedAt ? new Date(book.completedAt).toISOString().split('T')[0] : '',
        book.lastReadAt ? new Date(book.lastReadAt).toISOString().split('T')[0] : '',
        ...(options.includeTags ? [(book.tags || []).join('; ')] : []),
        ...(options.includeNotes ? [(book.notes || []).join('; ')] : []),
      ];
      
      // Escape quotes and wrap in quotes if contains comma
      return row.map(cell => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadFile(csvContent, 'my-library.csv', 'text/csv');
  };

  const exportJSON = async () => {
    const exportBooks = filteredBooks.map(book => ({
      title: book.title,
      author: book.author,
      genre: book.genre,
      status: book.status,
      priority: book.priority,
      format: book.format,
      totalPages: book.totalPages,
      currentPage: book.currentPage,
      progress: book.progress,
      language: book.language,
      addedAt: book.addedAt,
      startedAt: book.startedAt,
      completedAt: book.completedAt,
      lastReadAt: book.lastReadAt,
      ...(options.includeTags && { tags: book.tags }),
      ...(options.includeNotes && { notes: book.notes }),
    }));

    const jsonContent = JSON.stringify({
      exportDate: new Date().toISOString(),
      totalBooks: exportBooks.length,
      books: exportBooks,
    }, null, 2);

    downloadFile(jsonContent, 'my-library.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleStatusFilter = (status: string) => {
    setOptions(prev => ({
      ...prev,
      statusFilter: prev.statusFilter.includes(status)
        ? prev.statusFilter.filter(s => s !== status)
        : [...prev.statusFilter, status]
    }));
  };

  const statusOptions = [
    { value: 'toRead', label: 'To Read', count: books.filter(b => b.status === 'toRead').length },
    { value: 'reading', label: 'Currently Reading', count: books.filter(b => b.status === 'reading').length },
    { value: 'onHold', label: 'On Hold', count: books.filter(b => b.status === 'onHold').length },
    { value: 'finished', label: 'Finished', count: books.filter(b => b.status === 'finished').length },
    { value: 'dnf', label: 'Did Not Finish', count: books.filter(b => b.status === 'dnf').length },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl" data-testid="dialog-export">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Library
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Export Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total books:</span>
                  <span className="ml-2 font-medium">{books.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Selected:</span>
                  <span className="ml-2 font-medium">{filteredBooks.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Format:</span>
                  <span className="ml-2 font-medium">{options.format.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <span className="ml-2 font-medium">
                    {options.format === 'csv' ? '~' + Math.round(filteredBooks.length * 0.5) : '~' + Math.round(filteredBooks.length * 1.2)} KB
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Format Selection */}
          <div>
            <Label className="text-base font-medium">Export Format</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant={options.format === 'csv' ? 'default' : 'outline'}
                onClick={() => setOptions(prev => ({ ...prev, format: 'csv' }))}
                data-testid="button-format-csv"
              >
                CSV (Spreadsheet)
              </Button>
              <Button
                variant={options.format === 'json' ? 'default' : 'outline'}
                onClick={() => setOptions(prev => ({ ...prev, format: 'json' }))}
                data-testid="button-format-json"
              >
                JSON (Structured)
              </Button>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <Label className="text-base font-medium">Book Status Filter</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {statusOptions.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={options.statusFilter.includes(status.value)}
                    onCheckedChange={() => toggleStatusFilter(status.value)}
                    data-testid={`checkbox-status-${status.value}`}
                  />
                  <Label htmlFor={`status-${status.value}`} className="text-sm">
                    {status.label} ({status.count})
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Data Options */}
          <div>
            <Label className="text-base font-medium">Include Additional Data</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-tags"
                  checked={options.includeTags}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeTags: !!checked }))}
                  data-testid="checkbox-include-tags"
                />
                <Label htmlFor="include-tags" className="text-sm">
                  Tags and topics
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-notes"
                  checked={options.includeNotes}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeNotes: !!checked }))}
                  data-testid="checkbox-include-notes"
                />
                <Label htmlFor="include-notes" className="text-sm">
                  Book notes and highlights
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-progress"
                  checked={options.includeProgress}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeProgress: !!checked }))}
                  data-testid="checkbox-include-progress"
                />
                <Label htmlFor="include-progress" className="text-sm">
                  Reading progress and dates
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-export">
              Cancel
            </Button>
            <Button 
              onClick={exportData} 
              disabled={exporting || filteredBooks.length === 0}
              data-testid="button-export-download"
            >
              {exporting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {filteredBooks.length} Books
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}