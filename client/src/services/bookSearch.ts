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
      
      // Self-Help / Personal Development
      'self help': 'Self-Help / Personal Development',
      'self-help': 'Self-Help / Personal Development',
      'personal development': 'Self-Help / Personal Development',
      'self improvement': 'Self-Help / Personal Development',
      'self-improvement': 'Self-Help / Personal Development',
      'motivation': 'Self-Help / Personal Development',
      'productivity': 'Self-Help / Personal Development',
      'habits': 'Self-Help / Personal Development',
      
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
}

// Export a singleton instance
export const bookSearchService = new BookSearchService();