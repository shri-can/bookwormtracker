import { useState } from "react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BookSearchInput } from "./book-search-input";
import { Plus, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const addBookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  genre: z.string().min(1, "Genre is required"),
  usefulness: z.string().optional(),
  totalPages: z.number().min(1, "Total pages must be at least 1").optional(),
  isCurrentlyReading: z.boolean().default(false),
  currentPage: z.number().min(0, "Current page cannot be negative").optional(),
});

type AddBookForm = z.infer<typeof addBookSchema>;

const genres = [
  "Fiction",
  "Non-Fiction", 
  "Science",
  "Technology",
  "Business",
  "Self-Help",
  "Biography",
  "History",
  "Philosophy",
  "Psychology",
  "Design",
  "Programming",
  "Other"
];

interface AddBookDialogProps {
  onAddBook?: (book: AddBookForm) => void;
  trigger?: React.ReactNode;
}

export function AddBookDialog({ onAddBook, trigger }: AddBookDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAutoFetched, setHasAutoFetched] = useState(false);

  const form = useForm<AddBookForm>({
    resolver: zodResolver(addBookSchema),
    defaultValues: {
      title: "",
      author: "",
      genre: "",
      usefulness: "",
      totalPages: undefined,
      isCurrentlyReading: false,
      currentPage: 0,
    },
  });

  const handleBookSelect = (bookData: {
    title: string;
    author: string;
    genre: string;
    totalPages?: number;
    publishYear?: number;
  }) => {
    // Auto-populate form fields with fetched book data
    form.setValue("title", bookData.title);
    form.setValue("author", bookData.author);
    if (bookData.genre) {
      form.setValue("genre", bookData.genre);
    }
    if (bookData.totalPages) {
      form.setValue("totalPages", bookData.totalPages);
    }
    
    setHasAutoFetched(true);
    console.log("Auto-populated form with book data:", bookData);
  };

  const resetForm = () => {
    form.reset();
    setHasAutoFetched(false);
  };

  const onSubmit = async (data: AddBookForm) => {
    setIsSubmitting(true);
    console.log("Adding book:", data);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onAddBook?.(data);
    resetForm();
    setIsOpen(false);
    setIsSubmitting(false);
  };

  const defaultTrigger = (
    <Button data-testid="button-add-book">
      <Plus className="mr-2 h-4 w-4" />
      Add Book
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-add-book">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add New Book
            {hasAutoFetched && (
              <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <Sparkles className="h-4 w-4" />
                <span>Details fetched</span>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {hasAutoFetched 
              ? "Book details have been automatically filled. Review and adjust as needed."
              : "Start typing a book title to search and auto-fill details, or enter manually."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
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
            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter author name" {...field} data-testid="input-book-author" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genre</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-book-genre">
                        <SelectValue placeholder="Select a genre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genres.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="usefulness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How might this book be useful? (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Learning design principles, improving leadership skills..."
                      {...field} 
                      data-testid="textarea-book-usefulness"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalPages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Pages (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-total-pages"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentPage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Page</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
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
            <FormField
              control={form.control}
              name="isCurrentlyReading"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel>Currently Reading</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Mark this book as one you're actively reading
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-currently-reading"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-book">
                {isSubmitting ? "Adding..." : "Add Book"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}