# BookwormTracker

A personal reading tracker and book management application built with React, Node.js, and TypeScript.

## Features

- 📚 **Book Management**: Add, edit, and organize your personal library
- 🔍 **Smart Search**: AI-powered book search with Google Books API
- 📊 **Reading Progress**: Track reading sessions and progress
- 🎯 **Goals & Analytics**: Set reading goals and view statistics
- 📝 **Notes & Quotes**: Capture thoughts and quotes while reading
- 🤖 **AI Integration**: Smart categorization and topic extraction

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Run (Dev)

Start the development server:

```bash
npm run dev
```

The application will be available at `http://127.0.0.1:5000`

**VS Code Users**: Press `⇧⌘B` to run the "Dev" task.

## Persistence Options

### Memory Storage (Default)
- Fast, ephemeral storage
- Data is lost when server restarts
- Good for development and testing

### File Storage
- Persistent storage in `./data/store.json`
- Data survives server restarts
- Enable with environment variable:

```bash
LOCAL_PERSIST=1 npm run dev
```

Or create a `.env` file:
```bash
cp .env.example .env
# Edit .env and set LOCAL_PERSIST=1
```

## Seed Data

Populate the database with sample books:

```bash
npm run seed
```

This adds 3 sample books:
- Flow: The Psychology of Optimal Experience
- Antifragile: Things That Gain From Disorder  
- Thinking, Fast and Slow

## Sanity Test

Test that the server is running and responding:

```bash
npm run smoke
```

This will:
- Connect to the server
- Fetch the books API
- Report success/failure

## Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Key variables:
- `HOST`: Server host (default: 127.0.0.1)
- `PORT`: Server port (default: 5000)
- `LOCAL_PERSIST`: Use file storage (1) or memory (0)
- `VITE_OPENAI_API_KEY`: OpenAI API key for AI features

## Development

### Project Structure

```
├── client/          # React frontend
├── server/          # Node.js backend
├── shared/          # Shared types and schemas
├── scripts/         # Utility scripts
└── data/           # File storage (when enabled)
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Add sample data
- `npm run smoke` - Test server health
- `npm run check` - Type check

## AI Features

The application includes AI-powered features for:
- **Smart Categorization**: Automatically categorize books by genre
- **Topic Extraction**: Extract relevant topics from book descriptions
- **Personal Value**: Generate "How It Might Help Me" descriptions

Requires OpenAI API key in `VITE_OPENAI_API_KEY` environment variable.

## License

MIT
