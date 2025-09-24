# AI-Powered Topic Extraction Setup

This application now includes AI-powered topic extraction using OpenAI's API to intelligently categorize books and extract meaningful topics.

## Setup Instructions

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Create a new API key
4. Copy the API key (it starts with `sk-`)

### 2. Configure Environment Variable
1. Create a `.env` file in the root directory of the project
2. Add your API key:
   ```
   VITE_OPENAI_API_KEY=your_actual_api_key_here
   ```
3. Replace `your_actual_api_key_here` with your actual API key

### 3. Restart the Development Server
After adding the environment variable, restart your development server:
```bash
npm run dev
```

## How It Works

### AI-Powered Features
- **Smart Type Categorization**: Automatically categorizes books into the correct genre (Fiction, Business, Psychology, etc.)
- **Intelligent Topic Extraction**: Uses AI to extract 3-5 meaningful, specific topics that describe what the book is about
- **Contextual Analysis**: Analyzes title, author, description, and subjects to understand the book's purpose and content

### Fallback Behavior
- If no API key is provided, the system falls back to basic keyword matching
- If the AI service fails, users can still add topics manually
- The system gracefully handles errors and continues to function

### Example AI-Generated Topics
For a book like "The Lean Startup" by Eric Ries, the AI might extract:
- "Entrepreneurship"
- "Business Strategy" 
- "Innovation"
- "Startup Management"

Instead of generic terms like "Business" or "Non-fiction".

## Cost Considerations
- Uses GPT-3.5-turbo for cost efficiency
- Each topic extraction costs approximately $0.001-0.002
- Very affordable for personal use
- Consider setting usage limits in your OpenAI account if needed

## Privacy
- Book data is sent to OpenAI for analysis
- No personal information is included
- Only book metadata (title, author, description) is processed
- OpenAI's data usage policies apply
