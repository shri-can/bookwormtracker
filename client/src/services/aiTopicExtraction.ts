import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // Only for client-side usage
});

export interface BookData {
  title: string;
  author: string;
  description?: string;
  subjects?: string[];
  publishYear?: number;
}

export interface ExtractedTopics {
  topics: string[];
  reasoning: string;
}

/**
 * AI-powered topic extraction using OpenAI
 * Analyzes book data and extracts meaningful, relevant topics
 */
export async function extractTopicsWithAI(bookData: BookData): Promise<ExtractedTopics> {
  try {
    const prompt = `
You are an expert librarian and book categorization specialist. Analyze the following book information and extract 3-5 meaningful, specific topics that best describe what this book is about.

Book Information:
- Title: ${bookData.title}
- Author: ${bookData.author}
- Description: ${bookData.description || 'No description available'}
- Subjects: ${bookData.subjects?.join(', ') || 'No subjects available'}
- Publish Year: ${bookData.publishYear || 'Unknown'}

Instructions:
1. Extract 3-5 specific, meaningful topics that capture the book's main themes
2. Use clear, concise topic names (1-3 words each)
3. Focus on the book's actual content and purpose, not just generic categories
4. Avoid overly broad terms like "General", "Non-fiction", "Books"
5. Consider the book's practical applications and target audience
6. Topics should be useful for someone organizing their personal library
7. If the book is about psychology, focus on specific psychological concepts
8. If the book is about business, focus on specific business areas
9. If the book is about personal development, focus on specific improvement areas

Examples of good topics:
- "Flow State", "Focus", "Psychology", "Productivity", "Mental Performance"
- "Leadership", "Management", "Business Strategy", "Entrepreneurship"
- "Personal Finance", "Investment", "Wealth Building", "Money Management"
- "Communication", "Writing", "Design", "Technology", "History"

Please respond with a JSON object in this exact format:
{
  "topics": ["topic1", "topic2", "topic3"],
  "reasoning": "Brief explanation of why these topics were chosen"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert librarian who extracts meaningful topics from book information. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const result = JSON.parse(content);
    
    // Validate the response structure
    if (!result.topics || !Array.isArray(result.topics)) {
      throw new Error('Invalid response format from OpenAI');
    }

    return {
      topics: result.topics.slice(0, 5), // Limit to 5 topics max
      reasoning: result.reasoning || 'AI-generated topics based on book analysis'
    };

  } catch (error) {
    console.error('Error extracting topics with AI:', error);
    
    // Fallback to basic extraction if AI fails
    return {
      topics: extractBasicTopics(bookData),
      reasoning: 'Fallback to basic topic extraction due to AI error'
    };
  }
}

/**
 * Fallback topic extraction using basic keyword matching
 * Used when OpenAI API is not available or fails
 */
function extractBasicTopics(bookData: BookData): string[] {
  const allText = `${bookData.title} ${bookData.author} ${bookData.description || ''} ${bookData.subjects?.join(' ') || ''}`.toLowerCase();
  
  const topicKeywords = {
    "Productivity": ["productivity", "efficiency", "time management", "organization", "planning", "habits"],
    "Leadership": ["leadership", "management", "team", "influence", "authority", "decision making"],
    "Psychology": ["psychology", "behavior", "mind", "emotions", "mental", "cognitive", "happiness"],
    "Business": ["business", "entrepreneurship", "startup", "strategy", "marketing", "sales"],
    "Technology": ["technology", "tech", "digital", "innovation", "ai", "programming", "software"],
    "Health": ["health", "fitness", "wellness", "nutrition", "exercise", "medical"],
    "Finance": ["finance", "money", "investment", "wealth", "economics", "trading"],
    "Creativity": ["creativity", "design", "art", "innovation", "imagination", "creative"],
    "Communication": ["communication", "speaking", "writing", "presentation", "negotiation"],
    "Learning": ["learning", "education", "teaching", "knowledge", "skill", "development"]
  };
  
  const matchedTopics: string[] = [];
  
  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    const matchCount = keywords.filter(keyword => allText.includes(keyword)).length;
    if (matchCount >= 2) {
      matchedTopics.push(topic);
    }
  });
  
  // Add meaningful subjects if available
  const meaningfulSubjects = bookData.subjects?.filter(subject => 
    subject.length > 3 && 
    !subject.toLowerCase().includes("general") &&
    !subject.toLowerCase().includes("non-fiction") &&
    !subject.toLowerCase().includes("books")
  ) || [];
  
  const allTopics = [...matchedTopics, ...meaningfulSubjects.slice(0, 2)];
  return [...new Set(allTopics)].slice(0, 3);
}

/**
 * Check if OpenAI API key is available
 */
export function isOpenAIAvailable(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}
