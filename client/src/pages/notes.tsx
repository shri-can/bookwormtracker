import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Quote, BookOpen, Calendar } from "lucide-react";
import { format } from "date-fns";

// todo: remove mock functionality
const mockNotes = [
  {
    id: "1",
    bookId: "1",
    bookTitle: "Clean Code",
    bookAuthor: "Robert C. Martin",
    note: "Functions should do one thing and do it well. This principle helps create more maintainable and testable code.",
    page: 42,
    createdAt: "2024-01-15T10:30:00Z",
    tags: ["principles", "functions"],
  },
  {
    id: "2", 
    bookId: "2",
    bookTitle: "The Lean Startup",
    bookAuthor: "Eric Ries",
    note: "Build-Measure-Learn feedback loop is the core of the lean startup methodology. The goal is to minimize the time through this loop.",
    page: 78,
    createdAt: "2024-01-14T14:20:00Z",
    tags: ["methodology", "feedback"],
  },
  {
    id: "3",
    bookId: "1", 
    bookTitle: "Clean Code",
    bookAuthor: "Robert C. Martin",
    note: "Meaningful names are crucial. A name should tell you why it exists, what it does, and how it is used.",
    page: 18,
    createdAt: "2024-01-13T09:15:00Z",
    tags: ["naming", "best-practices"],
  },
  {
    id: "4",
    bookId: "3",
    bookTitle: "Atomic Habits",
    bookAuthor: "James Clear", 
    note: "You do not rise to the level of your goals. You fall to the level of your systems.",
    page: 27,
    createdAt: "2024-01-16T16:45:00Z",
    tags: ["habits", "systems", "quote"],
  },
];

const mockBooks = [
  { id: "1", title: "Clean Code", author: "Robert C. Martin" },
  { id: "2", title: "The Lean Startup", author: "Eric Ries" },
  { id: "3", title: "Atomic Habits", author: "James Clear" },
];

export default function Notes() {
  const [notes, setNotes] = useState(mockNotes);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBook, setSelectedBook] = useState("all");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({
    bookId: "",
    note: "",
    page: "",
    tags: "",
  });

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBook = selectedBook === "all" || note.bookId === selectedBook;
    return matchesSearch && matchesBook;
  });

  const handleAddNote = () => {
    if (!newNote.bookId || !newNote.note.trim()) return;
    
    const selectedBookData = mockBooks.find(book => book.id === newNote.bookId);
    if (!selectedBookData) return;

    const note = {
      id: Date.now().toString(),
      bookId: newNote.bookId,
      bookTitle: selectedBookData.title,
      bookAuthor: selectedBookData.author,
      note: newNote.note.trim(),
      page: parseInt(newNote.page) || 0,
      createdAt: new Date().toISOString(),
      tags: newNote.tags ? newNote.tags.split(',').map(tag => tag.trim()) : [],
    };

    setNotes(prev => [note, ...prev]);
    setNewNote({ bookId: "", note: "", page: "", tags: "" });
    setIsAddingNote(false);
    console.log("Note added:", note);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    console.log("Note deleted:", id);
  };

  return (
    <div className="space-y-6" data-testid="page-notes">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Reading Notes</h1>
          <p className="text-muted-foreground mt-1">
            {notes.length} notes from your reading sessions
          </p>
        </div>
        <Button 
          onClick={() => setIsAddingNote(true)}
          data-testid="button-add-note"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Add Note Form */}
      {isAddingNote && (
        <Card data-testid="card-add-note">
          <CardHeader>
            <CardTitle>Add New Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={newNote.bookId} onValueChange={(value) => setNewNote(prev => ({ ...prev, bookId: value }))}>
              <SelectTrigger data-testid="select-note-book">
                <SelectValue placeholder="Select a book" />
              </SelectTrigger>
              <SelectContent>
                {mockBooks.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title} - {book.author}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <Textarea
                  placeholder="Write your note or quote..."
                  value={newNote.note}
                  onChange={(e) => setNewNote(prev => ({ ...prev, note: e.target.value }))}
                  data-testid="textarea-note-content"
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Page #"
                  value={newNote.page}
                  onChange={(e) => setNewNote(prev => ({ ...prev, page: e.target.value }))}
                  data-testid="input-note-page"
                />
                <Input
                  placeholder="Tags (comma separated)"
                  value={newNote.tags}
                  onChange={(e) => setNewNote(prev => ({ ...prev, tags: e.target.value }))}
                  data-testid="input-note-tags"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddNote} data-testid="button-save-note">
                Save Note
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsAddingNote(false)}
                data-testid="button-cancel-note"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search notes, books, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-notes"
          />
        </div>
        <Select value={selectedBook} onValueChange={setSelectedBook}>
          <SelectTrigger className="w-48" data-testid="select-filter-book">
            <BookOpen className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by book" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Books</SelectItem>
            {mockBooks.map((book) => (
              <SelectItem key={book.id} value={book.id}>
                {book.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Quote className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notes found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedBook !== "all" 
                ? "Try adjusting your search criteria"
                : "Start taking notes while reading to capture insights"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="list-notes">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="hover-elevate" data-testid={`card-note-${note.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-serif" data-testid={`text-note-book-${note.id}`}>
                      {note.bookTitle}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground" data-testid={`text-note-author-${note.id}`}>
                      by {note.bookAuthor}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span data-testid={`text-note-date-${note.id}`}>
                      {format(new Date(note.createdAt), "MMM dd")}
                    </span>
                    {note.page > 0 && (
                      <>
                        <span>•</span>
                        <span data-testid={`text-note-page-${note.id}`}>Page {note.page}</span>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Quote className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <p className="text-sm leading-relaxed" data-testid={`text-note-content-${note.id}`}>
                    {note.note}
                  </p>
                </div>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1" data-testid={`tags-note-${note.id}`}>
                    {note.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs" data-testid={`tag-${tag}-${note.id}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}