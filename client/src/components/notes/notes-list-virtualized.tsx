import { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  PenTool, 
  Quote, 
  Highlighter, 
  FileText, 
  CheckSquare,
  Edit,
  Brain,
  MoreHorizontal,
  Calendar,
  BookOpen
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BookNote, Book } from '@shared/schema';

interface NotesListProps {
  notes: (BookNote & { book?: Book })[];
  onEditNote: (note: BookNote) => void;
  onDeleteNote: (noteId: string) => void;
  onMakeRecall: (noteId: string) => void;
}

const NOTE_TYPE_CONFIG = {
  note: { icon: PenTool, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Note' },
  quote: { icon: Quote, color: 'bg-green-100 text-green-700 border-green-200', label: 'Quote' },
  highlight: { icon: Highlighter, color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Highlight' },
  summary: { icon: FileText, color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Summary' },
  action: { icon: CheckSquare, color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Action' },
};

export function NotesListVirtualized({
  notes,
  onEditNote,
  onDeleteNote,
  onMakeRecall,
}: NotesListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // Estimated height per note card
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  const renderNote = (note: BookNote & { book?: Book }) => {
    const typeConfig = NOTE_TYPE_CONFIG[note.noteType as keyof typeof NOTE_TYPE_CONFIG] || NOTE_TYPE_CONFIG.note;
    const TypeIcon = typeConfig.icon;

    return (
      <Card 
        className="hover-elevate transition-all duration-200 group"
        data-testid={`note-card-${note.id}`}
      >
        <CardContent className="p-4">
          {/* Header with type pill, book info, and actions */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Badge 
                variant="secondary" 
                className={`${typeConfig.color} flex items-center gap-1 shrink-0`}
                data-testid={`note-type-${note.id}`}
              >
                <TypeIcon className="h-3 w-3" />
                {typeConfig.label}
              </Badge>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <BookOpen className="h-3 w-3 shrink-0" />
                <span className="truncate" data-testid={`note-book-${note.id}`}>
                  {note.book?.title || 'Unknown Book'}
                </span>
                {note.page && (
                  <>
                    <span>•</span>
                    <span data-testid={`note-page-${note.id}`}>p.{note.page}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditNote(note)}
                data-testid={`button-edit-${note.id}`}
              >
                <Edit className="h-3 w-3" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-menu-${note.id}`}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditNote(note)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMakeRecall(note.id)}>
                    <Brain className="h-4 w-4 mr-2" />
                    Make Recall
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeleteNote(note.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Note content (2-4 lines with truncation) */}
          <div className="mb-3">
            <p 
              className="text-sm leading-relaxed line-clamp-3"
              data-testid={`note-content-${note.id}`}
            >
              {note.content}
            </p>
          </div>

          {/* Footer with timestamp and tags */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span data-testid={`note-timestamp-${note.id}`}>
                {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
              </span>
            </div>

            {note.tags && note.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap" data-testid={`note-tags-${note.id}`}>
                {note.tags.slice(0, 3).map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs px-1 py-0"
                    data-testid={`note-tag-${tag}-${note.id}`}
                  >
                    {tag}
                  </Badge>
                ))}
                {note.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{note.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Quote className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No notes found</h3>
        <p className="text-muted-foreground max-w-md">
          Start capturing your thoughts and insights while reading. Use the quick capture above to add your first note.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto"
      style={{ height: '100%' }}
      data-testid="notes-list-container"
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const note = notes[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="px-4 pb-4"
            >
              {renderNote(note)}
            </div>
          );
        })}
      </div>
    </div>
  );
}