export interface BookSuggestion {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  number_of_pages_median?: number;
  subject?: string[];
  cover_i?: number;
  edition_key?: string[];
  cover_edition_key?: string;
}

export interface BookDetails {
  title: string;
  authors: string[];
  publishYear?: number;
  isbn?: string;
  pageCount?: number;
  subjects: string[];
  description?: string;
  coverUrl?: string;
}

const OPEN_LIBRARY_BASE = 'https://openlibrary.org';
const SEARCH_API = `${OPEN_LIBRARY_BASE}/search.json`;
const BOOKS_API = `${OPEN_LIBRARY_BASE}/api/books`;

export class BookSearchService {
  private controller: AbortController | null = null;

  async searchBooks(query: string, limit = 10): Promise<BookSuggestion[]> {
    if (!query.trim()) return [];

    // Cancel previous request if it exists
    if (this.controller) {
      this.controller.abort();
    }

    this.controller = new AbortController();

    try {
      const response = await fetch(
        `${SEARCH_API}?q=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,first_publish_year,isbn,number_of_pages_median,subject,cover_i,edition_key,cover_edition_key`,
        {
          signal: this.controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      return data.docs || [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return []; // Request was cancelled, return empty results
      }
      console.error('Book search error:', error);
      throw error;
    }
  }

  async getBookDetails(suggestion: BookSuggestion): Promise<BookDetails | null> {
    try {
      // Try to find a proper edition key for the Books API
      let bibkey = '';
      
      if (suggestion.cover_edition_key) {
        bibkey = `OLID:${suggestion.cover_edition_key}`;
      } else if (suggestion.edition_key && suggestion.edition_key.length > 0) {
        bibkey = `OLID:${suggestion.edition_key[0]}`;
      } else if (suggestion.isbn && suggestion.isbn.length > 0) {
        bibkey = `ISBN:${suggestion.isbn[0]}`;
      } else {
        // If no suitable key, return fallback data from suggestion
        return this.createFallbackDetails(suggestion);
      }

      const response = await fetch(
        `${BOOKS_API}?bibkeys=${bibkey}&jscmd=data&format=json`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch book details: ${response.status}`);
      }

      const data = await response.json();
      const bookData = Object.values(data)[0] as any;

      if (!bookData) {
        // Fallback to suggestion data if API details are unavailable
        return this.createFallbackDetails(suggestion);
      }

      // Extract and format the book details
      const details: BookDetails = {
        title: bookData.title || '',
        authors: bookData.authors ? bookData.authors.map((a: any) => a.name) : [],
        publishYear: bookData.publish_date ? parseInt(bookData.publish_date) : undefined,
        pageCount: bookData.number_of_pages || undefined,
        subjects: bookData.subjects ? bookData.subjects.map((s: any) => s.name) : [],
        description: bookData.description?.value || bookData.description,
        coverUrl: bookData.cover?.large || bookData.cover?.medium || bookData.cover?.small,
      };

      // Extract ISBN if available
      if (bookData.identifiers?.isbn_13?.length > 0) {
        details.isbn = bookData.identifiers.isbn_13[0];
      } else if (bookData.identifiers?.isbn_10?.length > 0) {
        details.isbn = bookData.identifiers.isbn_10[0];
      }

      return details;
    } catch (error) {
      console.error('Error fetching book details:', error);
      // Always return fallback data if API fails
      return this.createFallbackDetails(suggestion);
    }
  }

  private createFallbackDetails(suggestion: BookSuggestion): BookDetails {
    return {
      title: suggestion.title,
      authors: suggestion.author_name || [],
      publishYear: suggestion.first_publish_year,
      pageCount: suggestion.number_of_pages_median,
      subjects: suggestion.subject || [],
      coverUrl: suggestion.cover_i ? this.getCoverUrl(suggestion.cover_i, 'M') : undefined,
    };
  }

  getCoverUrl(coverI?: number, size: 'S' | 'M' | 'L' = 'M'): string | null {
    if (!coverI) return null;
    return `https://covers.openlibrary.org/b/id/${coverI}-${size}.jpg`;
  }

  // Utility method to get a reasonable genre from subjects that matches form options
  getMainGenre(subjects?: string[]): string {
    if (!subjects || subjects.length === 0) return 'Other';
    
    // Form genre options for exact matching
    const formGenres = [
      "Fiction", "Non-Fiction", "Science", "Technology", "Business", 
      "Self-Help", "Biography", "History", "Philosophy", "Psychology", 
      "Design", "Programming", "Other"
    ];

    // Mapping from common subject variations to form genres
    const genreMapping: Record<string, string> = {
      'non-fiction': 'Non-Fiction',
      'nonfiction': 'Non-Fiction',
      'science fiction': 'Fiction',
      'sci-fi': 'Fiction',
      'fantasy': 'Fiction',
      'mystery': 'Fiction',
      'romance': 'Fiction',
      'horror': 'Fiction',
      'thriller': 'Fiction',
      'computer science': 'Technology',
      'computers': 'Technology',
      'programming': 'Programming',
      'software': 'Programming',
      'web development': 'Programming',
      'self help': 'Self-Help',
      'self-improvement': 'Self-Help',
      'personal development': 'Self-Help',
      'business': 'Business',
      'entrepreneurship': 'Business',
      'management': 'Business',
      'economics': 'Business',
      'biography': 'Biography',
      'autobiography': 'Biography',
      'memoir': 'Biography',
      'history': 'History',
      'historical': 'History',
      'philosophy': 'Philosophy',
      'psychology': 'Psychology',
      'design': 'Design',
      'art': 'Design',
      'graphic design': 'Design',
    };

    // First, try direct match with form genres (case insensitive)
    for (const subject of subjects) {
      const normalizedSubject = subject.toLowerCase().trim();
      
      // Check for exact match
      const exactMatch = formGenres.find(genre => 
        genre.toLowerCase() === normalizedSubject
      );
      if (exactMatch) return exactMatch;
      
      // Check mapping
      if (genreMapping[normalizedSubject]) {
        return genreMapping[normalizedSubject];
      }
      
      // Check if subject contains any form genre
      for (const genre of formGenres) {
        if (normalizedSubject.includes(genre.toLowerCase())) {
          return genre;
        }
      }
    }

    // If no match found, return "Other"
    return 'Other';
  }

  cancel() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}

// Export a singleton instance
export const bookSearchService = new BookSearchService();