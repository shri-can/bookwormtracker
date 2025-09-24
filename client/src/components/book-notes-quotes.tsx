import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StickyNote, Quote, Plus, Edit, Trash2 } from 'lucide-react';
import type { Book } from '@shared/schema';

interface Note {
  id: string;
  text: string;
  createdAt: Date;
  pageNumber?: number;
}

interface Quote {
  id: string;
  text: string;
  createdAt: Date;
  pageNumber?: number;
}

interface BookNotesQuotesProps {
  book: Book;
}

export function BookNotesQuotes({ book }: BookNotesQuotesProps) {
  const [notes, setNotes] = useState<Note[]>([
    // Mock data - in real implementation, this would come from API
    {
      id: '1',
      text: 'Great insights on productivity systems',
      createdAt: new Date('2024-01-15'),
      pageNumber: 45
    },
    {
      id: '2', 
      text: 'The two-minute rule is really effective',
      createdAt: new Date('2024-01-16'),
      pageNumber: 67
    }
  ]);

  const [quotes, setQuotes] = useState<Quote[]>([
    // Mock data - in real implementation, this would come from API
    {
      id: '1',
      text: 'You can do anything, but not everything.',
      createdAt: new Date('2024-01-15'),
      pageNumber: 23
    },
    {
      id: '2',
      text: 'The secret of getting ahead is getting started.',
      createdAt: new Date('2024-01-16'),
      pageNumber: 89
    }
  ]);

  const [activeTab, setActiveTab] = useState<'notes' | 'quotes'>('notes');

  const handleAddNote = () => {
    const text = prompt('Add a note:');
    if (text && text.trim()) {
      const pageNumber = prompt('Page number (optional):');
      const newNote: Note = {
        id: Date.now().toString(),
        text: text.trim(),
        createdAt: new Date(),
        pageNumber: pageNumber ? parseInt(pageNumber) : undefined
      };
      setNotes(prev => [newNote, ...prev]);
    }
  };

  const handleAddQuote = () => {
    const text = prompt('Add a quote:');
    if (text && text.trim()) {
      const pageNumber = prompt('Page number (optional):');
      const newQuote: Quote = {
        id: Date.now().toString(),
        text: text.trim(),
        createdAt: new Date(),
        pageNumber: pageNumber ? parseInt(pageNumber) : undefined
      };
      setQuotes(prev => [newQuote, ...prev]);
    }
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Delete this note?')) {
      setNotes(prev => prev.filter(note => note.id !== id));
    }
  };

  const handleDeleteQuote = (id: string) => {
    if (confirm('Delete this quote?')) {
      setQuotes(prev => prev.filter(quote => quote.id !== id));
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Book Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{book.title}</CardTitle>
          <p className="text-sm text-muted-foreground">by {book.author}</p>
        </CardHeader>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'notes' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('notes')}
          className="flex-1"
        >
          <StickyNote className="w-4 h-4 mr-2" />
          Notes ({notes.length})
        </Button>
        <Button
          variant={activeTab === 'quotes' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('quotes')}
          className="flex-1"
        >
          <Quote className="w-4 h-4 mr-2" />
          Quotes ({quotes.length})
        </Button>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <Button
          onClick={activeTab === 'notes' ? handleAddNote : handleAddQuote}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {activeTab === 'notes' ? 'Note' : 'Quote'}
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'notes' ? (
        <div className="space-y-4">
          {notes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first note to capture insights from this book
                </p>
                <Button onClick={handleAddNote}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm mb-2">{note.text}</p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{formatDate(note.createdAt)}</span>
                        {note.pageNumber && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              Page {note.pageNumber}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newText = prompt('Edit note:', note.text);
                          if (newText && newText.trim()) {
                            setNotes(prev => prev.map(n => 
                              n.id === note.id ? { ...n, text: newText.trim() } : n
                            ));
                          }
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Quote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No quotes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Save inspiring quotes from this book
                </p>
                <Button onClick={handleAddQuote}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Quote
                </Button>
              </CardContent>
            </Card>
          ) : (
            quotes.map((quote) => (
              <Card key={quote.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <blockquote className="text-sm italic mb-2 border-l-2 border-muted pl-3">
                        "{quote.text}"
                      </blockquote>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{formatDate(quote.createdAt)}</span>
                        {quote.pageNumber && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              Page {quote.pageNumber}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newText = prompt('Edit quote:', quote.text);
                          if (newText && newText.trim()) {
                            setQuotes(prev => prev.map(q => 
                              q.id === quote.id ? { ...q, text: newText.trim() } : q
                            ));
                          }
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuote(quote.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
