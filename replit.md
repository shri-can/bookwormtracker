# Book Reading Tracker Application

## Overview

This is a comprehensive book reading tracker and library management application built with React and TypeScript. The application allows users to manage their personal book collection, track reading progress, take notes, and analyze reading statistics. It features a modern, scholarly design inspired by Notion and Goodreads, with support for both light and dark themes.

The application provides functionality for adding books (both manually and via bulk upload), tracking reading sessions, managing notes with tagging, and viewing detailed reading analytics. Users can organize books by genre, track usefulness ratings, and monitor their reading habits through comprehensive statistics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Radix UI primitives with shadcn/ui components for accessible, customizable interfaces
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Form Handling**: React Hook Form with Zod for validation and type safety

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon Database hosting)
- **API Design**: RESTful API endpoints following standard HTTP conventions
- **Data Storage**: In-memory storage implementation with interface for easy database migration

### Data Models
- **Books**: Core entity with title, author, genre, progress tracking, notes, topics, and usefulness ratings
- **Reading Sessions**: Track individual reading sessions with page ranges, dates, and notes
- **Schema Validation**: Zod schemas for runtime type checking and API validation

### Component Architecture
- **Layout System**: Sidebar navigation with responsive mobile support
- **Design System**: Consistent spacing, typography, and color schemes with dark/light theme support
- **Reusable Components**: Modular UI components for books, progress tracking, forms, and data display
- **Form Components**: Specialized components for book search, bulk upload, and data entry

### Key Features
- **Book Management**: Add books manually or via external API search, organize by genres and topics
- **Progress Tracking**: Track reading sessions, current page, and completion status
- **Note-Taking**: Add and manage notes with tagging system for easy organization
- **Statistics Dashboard**: View reading analytics, goals, and achievement tracking
- **Bulk Operations**: CSV import/export for managing large book collections
- **Responsive Design**: Mobile-first approach with collapsible sidebar and touch-friendly interfaces

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm** and **@neondatabase/serverless**: Database ORM and PostgreSQL driver
- **zod**: Schema validation and type inference
- **react-hook-form** and **@hookform/resolvers**: Form management and validation

### UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx** and **tailwind-merge**: Conditional CSS class utilities
- **lucide-react**: Icon library

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production builds

### External APIs
- **Open Library API**: Book search and metadata retrieval for adding books to the library
- **Google Fonts**: Web fonts (Inter, Crimson Text) for typography

### Database and Hosting
- **Neon Database**: Serverless PostgreSQL hosting platform
- **Replit**: Development and hosting environment with integrated tooling