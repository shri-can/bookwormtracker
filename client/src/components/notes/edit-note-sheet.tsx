import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  PenTool, 
  Quote, 
  Highlighter, 
  FileText, 
  CheckSquare,
  Calendar,
  Link as LinkIcon,
  Copy,
  ArrowRightLeft,
  Brain
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import type { BookNote, Book, UpdateBookNote } from '@shared/schema';

interface EditNoteSheetProps {
  note: BookNote | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (note: BookNote) => void;
  onDeleted?: (noteId: string) => void;
}

const NOTE_TYPES = [
  { id: 'note', label: 'Note', icon: PenTool, color: 'bg-blue-100 text-blue-700' },
  { id: 'quote', label: 'Quote', icon: Quote, color: 'bg-green-100 text-green-700' },
  { id: 'highlight', label: 'Highlight', icon: Highlighter, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'summary', label: 'Summary', icon: FileText, color: 'bg-purple-100 text-purple-700' },
  { id: 'action', label: 'Action', icon: CheckSquare, color: 'bg-orange-100 text-orange-700' },
];

const CONVERSION_OPTIONS = [
  { from: 'quote', to: 'summary', label: 'Quote → Summary' },
  { from: 'note', to: 'action', label: 'Note → Action' },
  { from: 'highlight', to: 'note', label: 'Highlight → Note' },
  { from: 'summary', to: 'note', label: 'Summary → Note' },
  { from: 'action', to: 'note', label: 'Action → Note' },
];

export function EditNoteSheet({ 
  note, 
  isOpen, 
  onOpenChange, 
  onUpdated, 
  onDeleted 
}: EditNoteSheetProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [page, setPage] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [makeRecall, setMakeRecall] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Fetch all books for book selector
  const { data: allBooks = [] } = useQuery({
    queryKey: ['/api/books'],
    queryFn: async () => {
      const response = await fetch('/api/books');
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
    enabled: isOpen,
  });

  // Reset form when note changes
  useEffect(() => {
    if (note) {
      setContent(note.content || '');
      setSelectedBookId(note.bookId);
      setPage(note.page?.toString() || '');
      setNoteType(note.noteType);
      setTags(note.tags || []);
      setMakeRecall(false);
      setNewTag('');
    }
  }, [note]);

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (noteData: UpdateBookNote) => {
      if (!note) throw new Error('No note to update');
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });
      if (!response.ok) throw new Error('Failed to update note');
      return await response.json();
    },
    onSuccess: (updatedNote: BookNote) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      onUpdated?.(updatedNote);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Failed to update note:', error);
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      if (!note) throw new Error('No note to delete');
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete note');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      onDeleted?.(note!.id);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Failed to delete note:', error);
    },
  });

  const handleSave = () => {
    if (!content.trim() || !selectedBookId) return;

    const noteData: UpdateBookNote = {
      content: content.trim(),
      bookId: selectedBookId,
      page: page ? parseInt(page) : undefined,
      noteType: noteType as any,
      tags: tags,
    };

    updateNoteMutation.mutate(noteData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate();
    }
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

  const handleConvertTo = (newType: string) => {
    setNoteType(newType);
  };

  const copyNoteLink = () => {
    if (note) {
      const link = `app://note/${note.id}`;
      navigator.clipboard.writeText(link);
      // Could show a toast here
    }
  };

  const selectedType = NOTE_TYPES.find(type => type.id === noteType) || NOTE_TYPES[0];
  const availableConversions = CONVERSION_OPTIONS.filter(option => option.from === noteType);
  const currentBook = allBooks.find(book => book.id === selectedBookId);

  if (!note) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-edit-note">
        <SheetHeader>
          <SheetTitle>Edit Note</SheetTitle>
          <SheetDescription>
            Make changes to your note. All fields are optional except content.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Note content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Write your note content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              data-testid="textarea-edit-content"
            />
            <div className="text-xs text-muted-foreground">
              {content.length} characters
            </div>
          </div>

          {/* Book and page */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Book</Label>
              <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                <SelectTrigger data-testid="select-edit-book">
                  <SelectValue placeholder="Select book" />
                </SelectTrigger>
                <SelectContent>
                  {allBooks.map(book => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title} - {book.author}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Page</Label>
              <Input
                type="number"
                placeholder="Page"
                value={page}
                onChange={(e) => setPage(e.target.value)}
                data-testid="input-edit-page"
              />
            </div>
          </div>

          {/* Note type */}
          <div className="space-y-3">
            <Label>Type</Label>
            <div className="flex gap-2 flex-wrap">
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
                    data-testid={`button-edit-type-${type.id}`}
                  >
                    <Icon className="h-3 w-3" />
                    {type.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Conversion shortcuts */}
          {availableConversions.length > 0 && (
            <div className="space-y-2">
              <Label>Convert to...</Label>
              <div className="flex gap-2 flex-wrap">
                {availableConversions.map(conversion => (
                  <Button
                    key={conversion.to}
                    variant="outline"
                    size="sm"
                    onClick={() => handleConvertTo(conversion.to)}
                    className="gap-1"
                    data-testid={`button-convert-${conversion.to}`}
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                    {conversion.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                data-testid="input-edit-tag"
              />
              <Button onClick={handleAddTag} size="sm" data-testid="button-edit-add-tag">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeTag(tag)}
                    data-testid={`edit-tag-${tag}`}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Recall toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="make-recall-edit"
                checked={makeRecall}
                onCheckedChange={setMakeRecall}
                data-testid="switch-edit-recall"
              />
              <Label htmlFor="make-recall-edit" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Make Recall
              </Label>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyNoteLink}
                data-testid="button-copy-link"
              >
                <LinkIcon className="h-4 w-4 mr-1" />
                Copy Link
              </Button>
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteNoteMutation.isPending}
            data-testid="button-delete-note"
          >
            {deleteNoteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-edit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content.trim() || !selectedBookId || updateNoteMutation.isPending}
            data-testid="button-save-edit"
          >
            {updateNoteMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}