import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  PenTool, 
  Quote, 
  Highlighter, 
  FileText, 
  CheckSquare, 
  Mic, 
  Camera, 
  Clipboard,
  ChevronDown,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import type { Book, InsertBookNote } from '@shared/schema';

interface QuickCaptureProps {
  isCollapsed: boolean;
  defaultBook?: Book | null;
  defaultPage?: number;
  onCapture?: (note: any) => void;
}

const NOTE_TYPES = [
  { id: 'note', label: 'Note', icon: PenTool, color: 'bg-blue-100 text-blue-700' },
  { id: 'quote', label: 'Quote', icon: Quote, color: 'bg-green-100 text-green-700' },
  { id: 'highlight', label: 'Highlight', icon: Highlighter, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'summary', label: 'Summary', icon: FileText, color: 'bg-purple-100 text-purple-700' },
  { id: 'action', label: 'Action', icon: CheckSquare, color: 'bg-orange-100 text-orange-700' },
];

export function QuickCaptureInline({ 
  isCollapsed, 
  defaultBook, 
  defaultPage,
  onCapture 
}: QuickCaptureProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [selectedBook, setSelectedBook] = useState<string>(defaultBook?.id || '');
  const [page, setPage] = useState<string>(defaultPage?.toString() || '');
  const [noteType, setNoteType] = useState<string>('note');
  const [makeRecall, setMakeRecall] = useState(false);
  const [addTag, setAddTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [bookSelectOpen, setBookSelectOpen] = useState(false);
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);

  // Fetch currently reading books for quick selection
  const { data: currentlyReadingBooks = [] } = useQuery({
    queryKey: ['/api/books/currently-reading'],
    queryFn: async () => {
      const response = await fetch('/api/books/currently-reading');
      if (!response.ok) throw new Error('Failed to fetch books');
      const data = await response.json();
      return data.map((book: any) => ({
        ...book,
        addedAt: new Date(book.addedAt),
        lastReadAt: book.lastReadAt ? new Date(book.lastReadAt) : null,
        startedAt: book.startedAt ? new Date(book.startedAt) : null,
        completedAt: book.completedAt ? new Date(book.completedAt) : null,
      })) as Book[];
    },
  });

  // Auto-fill book and page from Currently Reading if not provided
  useEffect(() => {
    if (!defaultBook && currentlyReadingBooks.length > 0 && !selectedBook) {
      const firstBook = currentlyReadingBooks[0];
      setSelectedBook(firstBook.id);
      if (!defaultPage && firstBook.currentPage) {
        setPage(firstBook.currentPage.toString());
      }
    }
  }, [currentlyReadingBooks, defaultBook, defaultPage, selectedBook]);

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: InsertBookNote) => {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });
      if (!response.ok) throw new Error('Failed to create note');
      return await response.json();
    },
    onSuccess: (newNote) => {
      // Invalidate notes queries
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      
      // Reset form
      setContent('');
      setNewTag('');
      setTags([]);
      setMakeRecall(false);
      setAddTag(false);
      
      // Keep book and page for convenience
      onCapture?.(newNote);
    },
    onError: (error) => {
      console.error('Failed to create note:', error);
    },
  });

  const handleSubmit = () => {
    if (!content.trim() || !selectedBook) return;

    const noteData: InsertBookNote = {
      bookId: selectedBook,
      content: content.trim(),
      noteType: noteType as any,
      page: page ? parseInt(page) : undefined,
      tags: tags,
    };

    createNoteMutation.mutate(noteData);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  const selectedType = NOTE_TYPES.find(type => type.id === noteType) || NOTE_TYPES[0];

  if (isCollapsed) {
    return null; // Will be handled by bottom sheet instead
  }

  return (
    <Card className="border-dashed" data-testid="card-quick-capture">
      <CardContent className="p-4 space-y-4">
        {/* Note content input */}
        <div className="space-y-2">
          <Label htmlFor="note-content" className="text-sm font-medium">Note content</Label>
          <Textarea
            id="note-content"
            placeholder={`Write your ${selectedType.label.toLowerCase()}...`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyPress}
            className="min-h-[80px] resize-none"
            data-testid="textarea-note-content"
            aria-describedby="content-help"
          />
          <div id="content-help" className="text-xs text-muted-foreground">
            ⌘+Enter to save • {content.length} characters
          </div>
        </div>

        {/* Book and page selectors */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="select-note-book-trigger">Book</Label>
            <Select 
              value={selectedBook} 
              onValueChange={setSelectedBook}
              open={bookSelectOpen}
              onOpenChange={setBookSelectOpen}
            >
              <SelectTrigger 
                id="select-note-book-trigger"
                data-testid="select-note-book"
                aria-label="Select book"
              >
                <SelectValue placeholder="Select book" />
              </SelectTrigger>
              <SelectContent 
                data-testid="listbox-note-book"
                className="z-50"
                position="popper"
                sideOffset={4}
                aria-labelledby="select-note-book-trigger"
              >
                {currentlyReadingBooks.map(book => (
                  <SelectItem 
                    key={book.id} 
                    value={book.id}
                    data-testid={`option-book-${book.id}`}
                  >
                    {book.title} - {book.author}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-page-input">Page</Label>
            <Input
              id="note-page-input"
              type="number"
              placeholder="Page"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              data-testid="input-note-page"
            />
          </div>
        </div>

        {/* Note type pills */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Type</Label>
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Note type">
            {NOTE_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = noteType === type.id;
              return (
                <Button
                  key={type.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNoteType(type.id)}
                  className={`${isSelected ? type.color : ''} gap-1`}
                  data-testid={`button-type-${type.id}`}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Select ${type.label} type`}
                >
                  <Icon className="h-3 w-3" />
                  {type.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Toggles and options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="make-recall"
                checked={makeRecall}
                onCheckedChange={setMakeRecall}
                data-testid="switch-make-recall"
                aria-describedby="recall-help"
              />
              <Label htmlFor="make-recall" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Make Recall
              </Label>
              <span id="recall-help" className="sr-only">
                Turn this note into a spaced repetition flashcard for later review
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="add-tag"
                checked={addTag}
                onCheckedChange={setAddTag}
                data-testid="switch-add-tag"
                aria-describedby="tag-help"
              />
              <Label htmlFor="add-tag">Add Tag</Label>
              <span id="tag-help" className="sr-only">
                Add tags to organize and filter this note
              </span>
            </div>
          </div>

          {addTag && (
            <div className="space-y-2">
              <Label htmlFor="new-tag-input" className="text-sm font-medium">Add tags</Label>
              <div className="flex gap-2">
                <Input
                  id="new-tag-input"
                  placeholder="Tag name"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  data-testid="input-new-tag"
                  aria-describedby="tag-input-help"
                />
                <Button 
                  onClick={handleAddTag} 
                  size="sm" 
                  data-testid="button-add-tag"
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </div>
              <div id="tag-input-help" className="text-xs text-muted-foreground">
                Press Enter to add tag
              </div>
              {tags.length > 0 && (
                <div className="flex gap-1 flex-wrap" aria-label="Current tags">
                  {tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                      data-testid={`chip-tag-${tag}`}
                      role="button"
                      aria-label={`Remove tag ${tag}`}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Secondary actions row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              data-testid="button-dictate"
              aria-label="Dictate note"
              title="Voice input (coming soon)"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              data-testid="button-camera"
              aria-label="Camera OCR"
              title="Camera OCR (coming soon)"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              data-testid="button-clipboard"
              aria-label="Paste from clipboard"
              title="Paste from clipboard"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setContent('');
                setTags([]);
                setNewTag('');
                setMakeRecall(false);
                setAddTag(false);
              }}
              data-testid="button-cancel-note"
              disabled={createNoteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || !selectedBook || createNoteMutation.isPending}
              data-testid="button-save-note"
              aria-busy={createNoteMutation.isPending}
            >
              {createNoteMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}