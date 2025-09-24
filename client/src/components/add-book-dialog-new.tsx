import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { BookSearchInput } from "./book-search-input";
import { addBookSchema, type AddBookForm, type InsertBook } from "@/shared/schema";
import { BOOK_GENRES, BOOK_STATUSES, BOOK_FORMATS } from "@/shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AddBookDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBook?: (book: InsertBook) => void;
}

export function AddBookDialog({ isOpen, onOpenChange, onAddBook }: AddBookDialogProps) {
  const [topicInput, setTopicInput] = useState("");
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<AddBookForm>({
    resolver: zodResolver(addBookSchema),
    defaultValues: {
      title: "",
      author: "",
      genre: "General Non-Fiction",
      topics: [],
      usefulness: "",
      totalPages: undefined,
      isCurrentlyReading: false,
      currentPage: 0,
      status: "toRead",
      priority: 3,
      format: "paper",
      language: "English",
      progress: 0,
    },
    mode: "onBlur",
  });

  const createBookMutation = useMutation({
    mutationFn: async (bookData: AddBookForm) => {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (newBook) => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      queryClient.invalidateQueries({ queryKey: ['/api/books/currently-reading'] });

      onOpenChange(false);
      form.reset();
      setHasAutoFetched(false);
      setTopicInput("");

      toast({
        title: "Book added successfully",
        description: "The book has been added to your library",
      });

      if (onAddBook) {
        const insertBookData = {
          title: newBook.title,
          author: newBook.author,
          genre: newBook.genre,
          status: newBook.status,
          priority: newBook.priority,
          format: newBook.format,
          language: newBook.language,
          progress: newBook.progress,
          topics: newBook.topics || [],
          usefulness: newBook.usefulness,
          totalPages: newBook.totalPages,
          currentPage: newBook.currentPage,
          isCurrentlyReading: newBook.isCurrentlyReading,
        };
        onAddBook(insertBookData);
      }
    },
    onError: (error: any) => {
      console.error('Failed to create book:', error);
      const errorMessage = error?.response?.data?.message ||
                          error?.message ||
                          'Failed to add book. Please check your input and try again.';

      toast({
        title: "Failed to add book",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleBookSelect = (book: any) => {
    if (book && !hasAutoFetched) {
      form.setValue("title", book.title || "");
      form.setValue("author", book.author_name?.[0] || "");
      form.setValue("totalPages", book.number_of_pages_median || undefined);
      form.setValue("topics", book.subject?.slice(0, 3) || []);
      setHasAutoFetched(true);
    }
  };

  const addTopic = (topic: string) => {
    const trimmedTopic = topic.trim();
    if (trimmedTopic && !form.getValues("topics").includes(trimmedTopic)) {
      const currentTopics = form.getValues("topics");
      form.setValue("topics", [...currentTopics, trimmedTopic]);
      setTopicInput("");
    }
  };

  const removeTopic = (topic: string) => {
    const currentTopics = form.getValues("topics");
    form.setValue("topics", currentTopics.filter(t => t !== topic));
  };

  const handleTopicKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTopic(topicInput);
    }
  };

  const onSubmit = async (data: AddBookForm) => {
    try {
      if (!data.title || !data.author) {
        toast({
          title: "Missing required fields",
          description: "Please enter both title and author",
          variant: "destructive",
        });
        return;
      }

      const cleanedData = {
        title: data.title.trim(),
        author: data.author.trim(),
        genre: data.genre,
        status: data.status,
        priority: data.priority,
        format: data.format,
        language: data.language || "English",
        progress: data.progress || 0,
        topics: (data.topics || []).filter(topic => topic.trim().length > 0),
        usefulness: data.usefulness || null,
        totalPages: data.totalPages || null,
        currentPage: data.currentPage || 0,
        isCurrentlyReading: data.isCurrentlyReading || false,
      };

      await createBookMutation.mutateAsync(cleanedData);
    } catch (error) {
      console.error('Failed to create book:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding the book",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Book</DialogTitle>
          <DialogDescription>
            Start typing a book title to search and auto-fill details, or enter manually.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Title - Full width */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <FormLabel className="col-span-2 text-sm">Title</FormLabel>
              <div className="col-span-10">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <BookSearchInput
                          value={field.value}
                          onChange={field.onChange}
                          onBookSelect={handleBookSelect}
                          placeholder="Start typing to search for books..."
                          data-testid="input-book-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Author & Type */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <FormLabel className="col-span-2 text-sm">Author</FormLabel>
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Enter author name" className="h-8" {...field} data-testid="input-book-author" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormLabel className="col-span-2 text-sm">Type</FormLabel>
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="select-book-genre" className="h-8">
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                          <SelectContent>
                            {BOOK_GENRES.map((genre) => (
                              <SelectItem key={genre} value={genre} data-testid={`option-genre-${genre.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}>
                                {genre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Topic & Status */}
            <div className="grid grid-cols-12 gap-2 items-start">
              <FormLabel className="col-span-2 text-sm mt-2">Topic</FormLabel>
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="topics"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            value={topicInput}
                            onChange={(e) => setTopicInput(e.target.value)}
                            onKeyDown={handleTopicKeyPress}
                            placeholder="Enter topics"
                            className="h-8"
                            data-testid="input-book-topics"
                          />
                          {field.value.length > 0 && (
                            <div className="flex flex-wrap gap-1" data-testid="topics-display">
                              {field.value.map((topic, index) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary" 
                                  className="text-xs"
                                  data-testid={`topic-badge-${index}`}
                                >
                                  {topic}
                                  <button
                                    type="button"
                                    onClick={() => removeTopic(topic)}
                                    className="ml-1 hover:text-destructive"
                                    data-testid={`button-remove-topic-${index}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormLabel className="col-span-2 text-sm mt-2">Status</FormLabel>
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="select-book-status" className="h-8">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {BOOK_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status === "toRead" ? "To Read" : 
                                 status === "reading" ? "Reading" :
                                 status === "onHold" ? "On Hold" :
                                 status === "dnf" ? "DNF" :
                                 "Finished"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Priority & Medium */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <FormLabel className="col-span-2 text-sm">Priority</FormLabel>
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => {
                    const priority = field.value || 3;
                    const getPriorityColor = (priority: number) => {
                      switch (priority) {
                        case 1: return "bg-red-100 text-red-800 border-red-200";
                        case 2: return "bg-orange-100 text-orange-800 border-orange-200";
                        case 3: return "bg-yellow-100 text-yellow-800 border-yellow-200";
                        case 4: return "bg-blue-100 text-blue-800 border-blue-200";
                        case 5: return "bg-green-100 text-green-800 border-green-200";
                        default: return "bg-gray-100 text-gray-800 border-gray-200";
                      }
                    };

                    return (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center space-x-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                const currentValue = field.value || 3;
                                if (currentValue > 1) {
                                  field.onChange(currentValue - 1);
                                }
                              }}
                              disabled={(field.value || 3) <= 1}
                              data-testid="button-priority-decrease"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <Input 
                              type="text"
                              placeholder="3" 
                              className={`text-center font-semibold text-xs w-8 h-6 px-1 ${getPriorityColor(priority)}`}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  field.onChange(undefined);
                                } else {
                                  const numValue = parseInt(value);
                                  if (!isNaN(numValue) && numValue >= 1 && numValue <= 5) {
                                    field.onChange(numValue);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value === "" || isNaN(parseInt(value))) {
                                  field.onChange(3);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Backspace' || e.key === 'Delete' || 
                                    e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
                                    e.key === 'Tab' || e.key === 'Enter' ||
                                    (e.key >= '0' && e.key <= '9')) {
                                  return;
                                }
                                e.preventDefault();
                              }}
                              data-testid="input-priority"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                const currentValue = field.value || 3;
                                if (currentValue < 5) {
                                  field.onChange(currentValue + 1);
                                }
                              }}
                              disabled={(field.value || 3) >= 5}
                              data-testid="button-priority-increase"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              <FormLabel className="col-span-2 text-sm">Medium</FormLabel>
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="select-book-format" className="h-8">
                            <SelectValue placeholder="Select medium" />
                          </SelectTrigger>
                          <SelectContent>
                            {BOOK_FORMATS.map((format) => (
                              <SelectItem key={format} value={format}>
                                {format === "paper" ? "Paper" : 
                                 format === "ebook" ? "E-book" : "Audiobook"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Language */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <FormLabel className="col-span-2 text-sm">Language</FormLabel>
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="English" 
                          className="h-8"
                          {...field}
                          data-testid="input-language"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-6"></div>
            </div>

            {/* How It Might Help Me - Full width */}
            <div className="grid grid-cols-12 gap-2 items-start">
              <FormLabel className="col-span-2 text-sm mt-2">How It Might Help Me</FormLabel>
              <div className="col-span-10">
                <FormField
                  control={form.control}
                  name="usefulness"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Learning design principles, improving leadership skills..."
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          data-testid="textarea-book-usefulness"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Total Pages & Current Page */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <FormLabel className="col-span-2 text-sm">Total Pages</FormLabel>
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="totalPages"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          className="h-8"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? parseInt(value) : null);
                          }}
                          data-testid="input-total-pages"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormLabel className="col-span-2 text-sm">Current Page</FormLabel>
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="currentPage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          className="h-8"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-current-page"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="isCurrentlyReading"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Currently Reading</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Mark this book as one you're actively reading
                    </div>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                      data-testid="checkbox-currently-reading"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBookMutation.isPending}
                data-testid="button-add-book"
              >
                {createBookMutation.isPending ? "Adding..." : "Add Book"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
