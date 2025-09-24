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
import { insertBookSchema, type InsertBook } from "../../../shared/schema";
import { BOOK_GENRES, BOOK_STATUSES, BOOK_FORMATS } from "../../../shared/schema";
import { extractTopicsWithAI, isOpenAIAvailable, type BookData } from "../services/aiTopicExtraction";
import { useToast } from "@/hooks/use-toast";

type AddBookForm = InsertBook;

interface AddBookDialogProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAddBook?: (book: InsertBook) => void;
  trigger?: React.ReactNode;
}

export function AddBookDialog({ isOpen: controlledIsOpen, onOpenChange: controlledOnOpenChange, onAddBook, trigger }: AddBookDialogProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledOnOpenChange || setInternalIsOpen;

  const form = useForm<AddBookForm>({
    resolver: zodResolver(insertBookSchema),
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

      setIsOpen(false);
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
          tags: [], // Add missing tags field
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

  // Create personal value proposition for "How It Might Help Me"
  const createConciseUsefulness = (description: string, title: string, author: string): string => {
    if (!description) return "";
    
    // Analyze the book to determine personal value
    const allText = `${title} ${author} ${description}`.toLowerCase();
    
    // Define personal value keywords and their benefits - more insightful and detailed
    const valueMappings = {
      "Learn to thrive in uncertainty and chaos, building systems that get stronger from stress and volatility rather than breaking down": ["antifragile", "uncertainty", "chaos", "volatility", "resilience", "robust", "stress", "shock"],
      "Improve decision-making and risk management by understanding probability, black swans, and how to make better choices under uncertainty": ["decision", "risk", "probability", "thinking", "strategy", "management", "black swan", "choice"],
      "Develop better mental models and frameworks for thinking clearly, avoiding cognitive biases, and making sense of complex situations": ["mental models", "frameworks", "thinking", "cognitive", "psychology", "mindset", "biases", "complexity"],
      "Build resilience and adaptability to bounce back from setbacks, embrace change, and grow stronger through challenges": ["resilience", "adaptability", "flexibility", "strength", "endurance", "toughness", "setbacks", "challenges"],
      "Enhance productivity and focus by achieving flow states, managing attention, and optimizing your mental performance for peak efficiency": ["productivity", "focus", "concentration", "efficiency", "time management", "flow", "attention", "performance"],
      "Improve leadership and communication skills to influence others, build better teams, and create meaningful impact in your work": ["leadership", "communication", "influence", "management", "team", "collaboration", "impact", "work"],
      "Master financial literacy and wealth building through smart investment strategies, understanding money, and building long-term prosperity": ["finance", "money", "investment", "wealth", "economics", "financial", "prosperity", "investment"],
      "Develop creativity and innovation by thinking differently, generating original ideas, and solving problems in unique ways": ["creativity", "innovation", "design", "art", "imagination", "originality", "problems", "solutions"],
      "Build better habits and systems that automate success, create consistency, and help you achieve your goals with less willpower": ["habits", "systems", "routines", "discipline", "consistency", "automation", "goals", "willpower"],
      "Understand human psychology and behavior to better navigate relationships, predict actions, and influence outcomes in your favor": ["psychology", "behavior", "human nature", "emotions", "cognitive", "mental", "relationships", "influence"],
      "Learn from history and avoid repeating mistakes by understanding patterns, cycles, and timeless principles that shape outcomes": ["history", "lessons", "mistakes", "patterns", "wisdom", "experience", "cycles", "principles"],
      "Develop critical thinking and analysis skills to evaluate information, spot logical fallacies, and make sound judgments in complex situations": ["critical thinking", "analysis", "logic", "reasoning", "evaluation", "assessment", "fallacies", "judgments"]
    };
    
    // Find the best personal value match
    let bestMatch = "";
    let highestScore = 0;
    
    Object.entries(valueMappings).forEach(([value, keywords]) => {
      const matchCount = keywords.filter(keyword => allText.includes(keyword)).length;
      if (matchCount > highestScore) {
        highestScore = matchCount;
        bestMatch = value;
      }
    });
    
    // If we found a good match, return it
    if (bestMatch && highestScore > 0) {
      return bestMatch;
    }
    
    // Fallback: try to extract a personal benefit from the description
    const benefitKeywords = [
      "learn", "improve", "develop", "build", "enhance", "master", "understand", 
      "gain", "acquire", "strengthen", "boost", "increase", "better", "help",
      "teach", "show", "reveal", "explain", "guide", "enable", "empower"
    ];
    
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 30);
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (benefitKeywords.some(keyword => lowerSentence.includes(keyword))) {
        // Extract the part that mentions personal benefit
        const words = sentence.split(' ');
        const benefitStart = words.findIndex(word => 
          benefitKeywords.some(keyword => word.toLowerCase().includes(keyword))
        );
        
        if (benefitStart !== -1) {
          const benefitPart = words.slice(benefitStart).join(' ');
          // Make it more insightful by adding context
          if (benefitPart.length > 50) {
            return benefitPart.length > 200 ? benefitPart.substring(0, 197) + "..." : benefitPart;
          }
        }
      }
    }
    
    // Additional fallback: look for action-oriented phrases
    const actionPhrases = [
      "how to", "ways to", "steps to", "secrets to", "principles of", "art of", "science of"
    ];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      for (const phrase of actionPhrases) {
        if (lowerSentence.includes(phrase)) {
          const startIndex = lowerSentence.indexOf(phrase);
          const benefitPart = sentence.substring(startIndex);
          return benefitPart.length > 200 ? benefitPart.substring(0, 197) + "..." : benefitPart;
        }
      }
    }
    
    // Final fallback: return empty string so user can fill it manually
    return "";
  };

  // AI-powered book categorization
  const categorizeBook = (book: any) => {
    const subjects = book.subjects || book.subject || [];
    const description = book.description || "";
    const title = book.title || "";
    const author = book.authors?.[0] || book.author_name?.[0] || "";
    
    // Combine all text for analysis
    const allText = `${title} ${author} ${subjects.join(" ")} ${description}`.toLowerCase();
    
    // Define category keywords and their mappings - improved for better accuracy
    const categoryMappings = {
      "Fiction": [
        "fiction", "novel", "story", "tale", "narrative", "literature", "drama", "romance", 
        "mystery", "thriller", "fantasy", "science fiction", "sci-fi", "horror", "adventure",
        "classic", "contemporary", "literary", "young adult", "ya", "children", "kids"
      ],
      "Personal Development": [
        "personal development", "self-help", "self improvement", "motivation", "success",
        "habits", "productivity", "time management", "goal setting", "mindset", "growth",
        "happiness", "wellness", "lifestyle", "life skills", "personal growth", "flow"
      ],
      "Business / Finance": [
        "business", "finance", "money", "investment", "entrepreneurship", "startup",
        "management", "leadership", "marketing", "sales", "economics", "trading",
        "wealth", "financial", "corporate", "strategy", "consulting", "accounting"
      ],
      "Philosophy / Spirituality": [
        "philosophy", "spirituality", "religion", "meditation", "mindfulness", "zen",
        "buddhism", "christianity", "islam", "hinduism", "theology", "metaphysics",
        "consciousness", "enlightenment", "wisdom", "meaning", "purpose", "ethics"
      ],
      "Psychology / Self-Improvement": [
        "psychology", "mental health", "therapy", "counseling", "behavior", "cognitive",
        "neuroscience", "brain", "mind", "emotions", "relationships", "communication",
        "social", "developmental", "clinical", "counseling", "behavioral", "flow",
        "focus", "attention", "concentration", "mental", "psychological"
      ],
      "History / Culture": [
        "history", "historical", "culture", "cultural", "society", "anthropology",
        "archaeology", "civilization", "war", "politics", "government", "social",
        "tradition", "heritage", "biography", "memoir", "autobiography"
      ],
      "Science / Technology": [
        "science", "technology", "tech", "engineering", "mathematics", "physics",
        "chemistry", "biology", "medicine", "health", "computer", "programming",
        "artificial intelligence", "ai", "data", "research", "innovation"
      ],
      "General Non-Fiction": [
        "non-fiction", "nonfiction", "reference", "education", "academic", "textbook",
        "guide", "manual", "handbook", "encyclopedia", "dictionary", "atlas"
      ],
      "Biography/Memoir": [
        "biography", "memoir", "autobiography", "life story", "personal story",
        "journey", "experience", "testimony", "recollection", "chronicle"
      ]
    };
    
    // Score each category based on keyword matches
    const categoryScores: { [key: string]: number } = {};
    
    Object.entries(categoryMappings).forEach(([category, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        if (allText.includes(keyword)) {
          score += 1;
          // Give extra weight to title and author matches
          if (title.toLowerCase().includes(keyword) || author.toLowerCase().includes(keyword)) {
            score += 2;
          }
          // Give extra weight to subject matches
          if (subjects.some((subject: string) => subject.toLowerCase().includes(keyword))) {
            score += 3;
          }
        }
      });
      categoryScores[category] = score;
    });
    
    // Find the category with the highest score
    const bestCategory = Object.entries(categoryScores).reduce((a, b) => 
      categoryScores[a[0]] > categoryScores[b[0]] ? a : b
    )[0];
    
    // If no clear match, default to General Non-Fiction
    return categoryScores[bestCategory] > 0 ? bestCategory : "General Non-Fiction";
  };

  // AI-powered topic extraction with loading state
  const [isExtractingTopics, setIsExtractingTopics] = useState(false);
  
  // Fallback topic extraction function
  const extractFallbackTopics = (book: any): string[] => {
    const subjects = book.subjects || book.subject || [];
    const description = book.description || "";
    const title = book.title || "";
    const allText = `${title} ${subjects.join(" ")} ${description}`.toLowerCase();
    
    const topicKeywords = {
      "Flow State": ["flow", "focus", "concentration", "attention", "mental state"],
      "Psychology": ["psychology", "behavior", "mind", "emotions", "mental", "cognitive"],
      "Productivity": ["productivity", "efficiency", "time management", "organization", "planning"],
      "Leadership": ["leadership", "management", "team", "influence", "authority"],
      "Business": ["business", "entrepreneurship", "startup", "strategy", "marketing"],
      "Technology": ["technology", "tech", "digital", "innovation", "ai", "programming"],
      "Health": ["health", "fitness", "wellness", "nutrition", "exercise"],
      "Finance": ["finance", "money", "investment", "wealth", "economics"],
      "Creativity": ["creativity", "design", "art", "innovation", "imagination"],
      "Communication": ["communication", "speaking", "writing", "presentation"],
      "Learning": ["learning", "education", "teaching", "knowledge", "skill"]
    };
    
    const matchedTopics: string[] = [];
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const matchCount = keywords.filter(keyword => allText.includes(keyword)).length;
      if (matchCount >= 1) { // Lower threshold for fallback
        matchedTopics.push(topic);
      }
    });
    
    // If no matches, use subjects directly
    if (matchedTopics.length === 0 && subjects.length > 0) {
      return subjects.slice(0, 3).map((subject: string) => subject.trim());
    }
    
    return matchedTopics.slice(0, 3);
  };

  const extractSmartTopics = async (book: any): Promise<string[]> => {
    if (!isOpenAIAvailable()) {
      console.log("OpenAI API key not available, using fallback topic extraction");
      return extractFallbackTopics(book);
    }

    try {
      setIsExtractingTopics(true);
      
      const bookData: BookData = {
        title: book.title || "",
        author: book.authors?.[0] || book.author_name?.[0] || "",
        description: book.description || "",
        subjects: book.subjects || book.subject || [],
        publishYear: book.publishYear || book.first_publish_year
      };
      
      const result = await extractTopicsWithAI(bookData);
      console.log("AI topic extraction result:", result);
      
      return result.topics;
    } catch (error) {
      console.error("Error extracting topics with AI:", error);
      // Return fallback topics on error
      return extractFallbackTopics(book);
    } finally {
      setIsExtractingTopics(false);
    }
  };

  const handleBookSelect = async (book: any) => {
    if (book && !hasAutoFetched) {
      console.log("Auto-populated book details:", book);
      
      // Handle both Google Books and Open Library formats
      const title = book.title || "";
      const author = book.authors?.[0] || book.author_name?.[0] || "";
      const totalPages = book.pageCount || book.number_of_pages_median || undefined;
      const description = book.description || "";
      const publishYear = book.publishYear || book.first_publish_year;
      
      // AI-powered categorization
      const smartGenre = categorizeBook(book);
      
      console.log("AI categorization:", { smartGenre });
      
      // Set basic fields immediately
      form.setValue("title", title);
      form.setValue("author", author);
      form.setValue("genre", smartGenre as any); // Use AI-categorized genre
      form.setValue("totalPages", totalPages);
      
      // Create a concise, useful description for "How It Might Help Me"
      const conciseUsefulness = createConciseUsefulness(description, title, author);
      form.setValue("usefulness", conciseUsefulness);
      
      // Extract topics asynchronously with AI
      try {
        console.log("Starting AI topic extraction for:", { title, author, subjects: book.subjects || book.subject });
        const smartTopics = await extractSmartTopics(book);
        console.log("AI topic extraction completed:", smartTopics);
        if (smartTopics && smartTopics.length > 0) {
          form.setValue("topics", smartTopics); // Use AI-extracted topics
        } else {
          console.log("No topics extracted, using fallback");
          // Use fallback topic extraction
          const fallbackTopics = extractFallbackTopics(book);
          form.setValue("topics", fallbackTopics);
        }
      } catch (error) {
        console.error("Failed to extract topics:", error);
        // Use fallback topic extraction
        const fallbackTopics = extractFallbackTopics(book);
        form.setValue("topics", fallbackTopics);
      }
      
      // Set some smart defaults based on the book data
      if (publishYear) {
        console.log("Publish year:", publishYear);
      }
      
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
        tags: [], // Add missing tags field
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
    <>
      {trigger && (
        <div onClick={() => setIsOpen(true)}>
          {trigger}
        </div>
      )}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              <div className="col-span-1"></div>
              <FormLabel className="col-span-1 text-sm">Type</FormLabel>
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
                       {isExtractingTopics && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
                           AI is analyzing topics...
                         </div>
                       )}
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
              <div className="col-span-1"></div>
              <FormLabel className="col-span-2 text-sm mt-2">Status</FormLabel>
              <div className="col-span-3">
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
              <div className="col-span-1"></div>
              <FormLabel className="col-span-2 text-sm">Medium</FormLabel>
              <div className="col-span-3">
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
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
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
                onClick={() => setIsOpen(false)}
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
    </>
  );
}
