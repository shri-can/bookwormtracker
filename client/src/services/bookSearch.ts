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
  // Google Books specific fields
  googleId?: string;
  thumbnail?: string;
  description?: string;
  publisher?: string;
  averageRating?: number;
  ratingsCount?: number;
  categories?: string[];
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
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

export class BookSearchService {
  private controller: AbortController | null = null;
  private searchCache = new Map<string, { results: BookSuggestion[], timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async searchBooks(query: string, limit = 10): Promise<BookSuggestion[]> {
    if (!query.trim()) return [];

    // Check cache first
    const cacheKey = `${query.toLowerCase()}-${limit}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.results;
    }

    // Cancel previous request if it exists
    if (this.controller) {
      this.controller.abort();
    }

    this.controller = new AbortController();

    try {
      // Try Google Books API first (faster and better results)
      const results = await this.searchGoogleBooks(query, limit);
      
      // Cache the results
      this.searchCache.set(cacheKey, {
        results,
        timestamp: Date.now()
      });
      
      return results;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return []; // Request was cancelled, return empty results
      }
      console.error('Book search error:', error);
      
      // Fallback to Open Library if Google Books fails
      try {
        const fallbackResults = await this.searchOpenLibrary(query, limit);
        this.searchCache.set(cacheKey, {
          results: fallbackResults,
          timestamp: Date.now()
        });
        return fallbackResults;
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  }

  private async searchGoogleBooks(query: string, limit: number): Promise<BookSuggestion[]> {
    const searchUrl = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=${limit}&orderBy=relevance&printType=books`;
    
    const response = await fetch(searchUrl, {
      signal: this.controller?.signal,
    });

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }

    const data = await response.json();
    const books = data.items || [];

    return books.map((item: any, index: number) => {
      const volumeInfo = item.volumeInfo || {};
      const imageLinks = volumeInfo.imageLinks || {};
      
      return {
        key: `google-${item.id}-${index}`,
        googleId: item.id,
        title: volumeInfo.title || 'Unknown Title',
        author_name: volumeInfo.authors || ['Unknown Author'],
        first_publish_year: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.split('-')[0]) : undefined,
        isbn: volumeInfo.industryIdentifiers?.map((id: any) => id.identifier) || [],
        number_of_pages_median: volumeInfo.pageCount || undefined,
        subject: volumeInfo.categories || [],
        thumbnail: imageLinks.thumbnail || imageLinks.smallThumbnail || '',
        description: volumeInfo.description || '',
        publisher: volumeInfo.publisher || '',
        averageRating: volumeInfo.averageRating || 0,
        ratingsCount: volumeInfo.ratingsCount || 0,
        categories: volumeInfo.categories || [],
        cover_i: this.extractCoverId(imageLinks.thumbnail),
      };
    });
  }

  private async searchOpenLibrary(query: string, limit: number): Promise<BookSuggestion[]> {
    const response = await fetch(
      `${SEARCH_API}?q=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,first_publish_year,isbn,number_of_pages_median,subject,cover_i,edition_key,cover_edition_key`,
      {
        signal: this.controller?.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Open Library search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.docs || [];
  }

  private extractCoverId(thumbnailUrl?: string): number | undefined {
    if (!thumbnailUrl) return undefined;
    const match = thumbnailUrl.match(/\/b\/id\/(\d+)-/);
    return match ? parseInt(match[1]) : undefined;
  }

  async getBookDetails(suggestion: BookSuggestion): Promise<BookDetails | null> {
    try {
      // If we have Google Books data, use it directly
      if (suggestion.googleId) {
        return this.createGoogleBooksDetails(suggestion);
      }

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

  private createGoogleBooksDetails(suggestion: BookSuggestion): BookDetails {
    return {
      title: suggestion.title,
      authors: suggestion.author_name || [],
      publishYear: suggestion.first_publish_year,
      pageCount: suggestion.number_of_pages_median,
      subjects: suggestion.subject || suggestion.categories || [],
      description: suggestion.description,
      coverUrl: suggestion.thumbnail,
      isbn: suggestion.isbn?.[0],
    };
  }

  private createFallbackDetails(suggestion: BookSuggestion): BookDetails {
    return {
      title: suggestion.title,
      authors: suggestion.author_name || [],
      publishYear: suggestion.first_publish_year,
      pageCount: suggestion.number_of_pages_median,
      subjects: suggestion.subject || [],
      coverUrl: suggestion.cover_i ? this.getCoverUrl(suggestion.cover_i, 'M') || undefined : undefined,
    };
  }

  getCoverUrl(coverI?: number, size: 'S' | 'M' | 'L' = 'M'): string | null {
    if (!coverI) return null;
    return `https://covers.openlibrary.org/b/id/${coverI}-${size}.jpg`;
  }

  // Map subjects to one of our fixed genre options
  getCanonicalGenre(subjects?: string[]): string {
    if (!subjects || subjects.length === 0) return 'General Non-Fiction';
    
    // Define keyword mapping to our fixed genres
    const genreMapping: Record<string, string> = {
      // Fiction keywords
      'fiction': 'Fiction',
      'novel': 'Fiction', 
      'science fiction': 'Fiction',
      'fantasy': 'Fiction',
      'mystery': 'Fiction',
      'romance': 'Fiction',
      'horror': 'Fiction',
      'thriller': 'Fiction',
      'adventure': 'Fiction',
      'drama': 'Fiction',
      'literary fiction': 'Fiction',
      
      // Personal Development
      'self help': 'Personal Development',
      'self-help': 'Personal Development',
      'personal development': 'Personal Development',
      'self improvement': 'Personal Development',
      'self-improvement': 'Personal Development',
      'motivation': 'Personal Development',
      'productivity': 'Personal Development',
      'habits': 'Personal Development',
      
      // Business / Finance
      'business': 'Business / Finance',
      'entrepreneurship': 'Business / Finance',
      'management': 'Business / Finance',
      'economics': 'Business / Finance',
      'finance': 'Business / Finance',
      'investing': 'Business / Finance',
      'money': 'Business / Finance',
      'leadership': 'Business / Finance',
      'marketing': 'Business / Finance',
      'startup': 'Business / Finance',
      
      // Philosophy / Spirituality  
      'philosophy': 'Philosophy / Spirituality',
      'spirituality': 'Philosophy / Spirituality',
      'religion': 'Philosophy / Spirituality',
      'meditation': 'Philosophy / Spirituality',
      'wisdom': 'Philosophy / Spirituality',
      'ethics': 'Philosophy / Spirituality',
      'consciousness': 'Philosophy / Spirituality',
      
      // Psychology / Self-Improvement
      'psychology': 'Psychology / Self-Improvement',
      'cognitive science': 'Psychology / Self-Improvement',
      'behavioral psychology': 'Psychology / Self-Improvement',
      'mental health': 'Psychology / Self-Improvement',
      'therapy': 'Psychology / Self-Improvement',
      'mindfulness': 'Psychology / Self-Improvement',
      'emotional intelligence': 'Psychology / Self-Improvement',
      
      // History / Culture
      'history': 'History / Culture',
      'culture': 'History / Culture',
      'anthropology': 'History / Culture',
      'sociology': 'History / Culture',
      'civilization': 'History / Culture',
      'world history': 'History / Culture',
      'cultural studies': 'History / Culture',
      
      // Science / Technology
      'science': 'Science / Technology',
      'technology': 'Science / Technology',
      'computer science': 'Science / Technology',
      'programming': 'Science / Technology',
      'physics': 'Science / Technology',
      'biology': 'Science / Technology',
      'chemistry': 'Science / Technology',
      'mathematics': 'Science / Technology',
      'engineering': 'Science / Technology',
      'artificial intelligence': 'Science / Technology',
      
      // Biography/Memoir
      'biography': 'Biography/Memoir',
      'autobiography': 'Biography/Memoir',
      'memoir': 'Biography/Memoir',
      'memoirs': 'Biography/Memoir',
      'personal narrative': 'Biography/Memoir',
    };

    // Check each subject for keyword matches
    for (const subject of subjects) {
      const normalizedSubject = subject.toLowerCase().trim();
      
      // Direct match
      if (genreMapping[normalizedSubject]) {
        return genreMapping[normalizedSubject];
      }
      
      // Partial match - check if subject contains any keywords
      for (const [keyword, genre] of Object.entries(genreMapping)) {
        if (normalizedSubject.includes(keyword)) {
          return genre;
        }
      }
    }

    // Check if any subjects suggest fiction (generic fiction indicators)
    const fictionIndicators = ['juvenile', 'young adult', 'children', 'stories'];
    for (const subject of subjects) {
      const normalized = subject.toLowerCase();
      if (fictionIndicators.some(indicator => normalized.includes(indicator))) {
        return 'Fiction';
      }
    }

    // Default fallback
    return 'General Non-Fiction';
  }

  // Extract relevant topics from subjects and description
  extractTopics(subjects?: string[], description?: string, maxTopics = 5): string[] {
    const topics = new Set<string>();
    
    // Topic keywords to look for
    const topicKeywords: Record<string, string> = {
      'redemption': 'Redemption',
      'betrayal': 'Betrayal', 
      'cultural conflict': 'Cultural Conflict',
      'identity': 'Identity',
      'friendship': 'Friendship',
      'trauma': 'Trauma',
      'forgiveness': 'Forgiveness',
      'immigration': 'Immigration',
      'loyalty': 'Loyalty',
      'guilt': 'Guilt',
      'class': 'Social Class',
      'war': 'War',
      'resilience': 'Resilience',
      'coming of age': 'Coming of Age',
      'family': 'Family',
      'love': 'Love',
      'death': 'Death',
      'power': 'Power',
      'corruption': 'Corruption',
      'survival': 'Survival',
      'violence': 'Violence',
      'justice': 'Justice',
      'freedom': 'Freedom',
      'oppression': 'Oppression',
      'revolution': 'Revolution',
      'leadership': 'Leadership',
      'innovation': 'Innovation',
      'success': 'Success',
      'failure': 'Failure',
      'courage': 'Courage',
      'fear': 'Fear',
      'hope': 'Hope',
      'transformation': 'Transformation',
      'self-discovery': 'Self-Discovery',
      'relationships': 'Relationships',
      'morality': 'Morality',
      'sacrifice': 'Sacrifice',
      'honor': 'Honor',
      'tradition': 'Tradition',
      'change': 'Change',
      'conflict': 'Conflict',
      'peace': 'Peace',
      'loss': 'Loss',
      'recovery': 'Recovery',
      'growth': 'Personal Growth',
      'purpose': 'Purpose',
      'meaning': 'Meaning',
      'truth': 'Truth',
      'deception': 'Deception',
    };

    // Filter out noise from subjects and extract clean topics
    const filterOutTerms = [
      'fiction', 'nonfiction', 'non-fiction', 'novel', 'book', 'books', 'literature',
      'english', 'american', 'british', 'juvenile', 'adult', 'young adult',
      'textbook', 'study guide', 'guide', 'handbook', 'manual', 'reference',
      'collection', 'anthology', 'series', 'volume', 'edition', 'revised',
      'paperback', 'hardcover', 'ebook', 'audiobook', 'large print',
      'accessible book', 'protected daisy', 'in library', 'borrowable',
    ];

    if (subjects) {
      for (const subject of subjects) {
        const normalized = subject.toLowerCase().trim();
        
        // Skip noise terms and very long/generic subjects
        if (filterOutTerms.some(term => normalized.includes(term)) || 
            normalized.length > 50 || 
            /^\d{4}$/.test(normalized) || // Skip years
            normalized.includes('accessible_book') ||
            normalized.includes('protected_daisy')) {
          continue;
        }

        // Check for topic keywords in subject
        for (const [keyword, topic] of Object.entries(topicKeywords)) {
          if (normalized.includes(keyword)) {
            topics.add(topic);
          }
        }

        // Add clean subjects as topics if they're concise and meaningful
        if (normalized.length <= 25 && 
            normalized.split(' ').length <= 3 &&
            !normalized.includes('--') &&
            normalized !== 'fiction' &&
            normalized !== 'non-fiction') {
          // Title case the subject
          const titleCased = subject.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          topics.add(titleCased);
        }
      }
    }

    // Check description for topic keywords
    if (description) {
      const descLower = description.toLowerCase();
      for (const [keyword, topic] of Object.entries(topicKeywords)) {
        if (descLower.includes(keyword)) {
          topics.add(topic);
        }
      }
    }

    // Return top topics, limiting to maxTopics
    return Array.from(topics).slice(0, maxTopics);
  }

  cancel() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  clearCache() {
    this.searchCache.clear();
  }

  // Get cache statistics for debugging
  getCacheStats() {
    return {
      size: this.searchCache.size,
      keys: Array.from(this.searchCache.keys()),
    };
  }
}

// Export a singleton instance
export const bookSearchService = new BookSearchService();