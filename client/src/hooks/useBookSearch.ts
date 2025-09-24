import { useState, useEffect, useCallback, useRef } from 'react';
import { bookSearchService, BookSuggestion } from '@/services/bookSearch';

interface UseBookSearchResult {
  suggestions: BookSuggestion[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearSuggestions: () => void;
}

export function useBookSearch(debounceMs = 150): UseBookSearchResult {
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((query: string) => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Clear error state
    setError(null);

    // If query is empty, clear suggestions immediately
    if (!query.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    // Set loading state immediately for better UX
    setIsLoading(true);

    // Debounce the actual search
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await bookSearchService.searchBooks(query, 8);
        setSuggestions(results);
        setError(null);
      } catch (err) {
        console.error('Book search failed:', err);
        setError('Failed to search for books. Please try again.');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [debounceMs]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setIsLoading(false);
    setError(null);
    bookSearchService.cancel();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      bookSearchService.cancel();
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    search,
    clearSuggestions,
  };
}