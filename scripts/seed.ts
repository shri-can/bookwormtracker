import { FileStorage } from '../server/storage/FileStorage';
import { MemStorage } from '../server/storage';
import { type InsertBook } from '../shared/schema';

const storage = process.env.LOCAL_PERSIST === '1' ? new FileStorage() : new MemStorage();

const sampleBooks: InsertBook[] = [
  {
    title: "Flow: The Psychology of Optimal Experience",
    author: "Mihaly Csikszentmihalyi",
    genre: "Psychology / Self-Improvement",
    topics: ["Flow State", "Psychology", "Focus", "Mental Performance"],
    usefulness: "Learn to achieve flow states and enhance productivity by managing attention and optimizing mental performance for peak efficiency",
    totalPages: 303,
    currentPage: 0,
    isCurrentlyReading: false,
    status: "toRead",
    priority: 4,
    format: "paper",
    language: "English",
    progress: 0,
    notes: [],
    tags: []
  },
  {
    title: "Antifragile: Things That Gain From Disorder",
    author: "Nassim Nicholas Taleb",
    genre: "Business / Finance",
    topics: ["Uncertainty", "Risk Management", "Decision Making", "Resilience"],
    usefulness: "Learn to thrive in uncertainty and chaos, building systems that get stronger from stress and volatility rather than breaking down",
    totalPages: 519,
    currentPage: 0,
    isCurrentlyReading: false,
    status: "toRead",
    priority: 5,
    format: "paper",
    language: "English",
    progress: 0,
    notes: [],
    tags: []
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    genre: "Psychology / Self-Improvement",
    topics: ["Cognitive Biases", "Decision Making", "Psychology", "Critical Thinking"],
    usefulness: "Develop better mental models and frameworks for thinking clearly, avoiding cognitive biases, and making sense of complex situations",
    totalPages: 499,
    currentPage: 0,
    isCurrentlyReading: false,
    status: "toRead",
    priority: 3,
    format: "paper",
    language: "English",
    progress: 0,
    notes: [],
    tags: []
  }
];

async function seed() {
  console.log('🌱 Seeding database with sample books...');
  
  try {
    for (const bookData of sampleBooks) {
      const book = await storage.createBook(bookData);
      console.log(`✅ Added: ${book.title} by ${book.author}`);
    }
    
    console.log(`\n🎉 Successfully seeded ${sampleBooks.length} books!`);
    console.log('📚 You can now start the development server with: npm run dev');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
