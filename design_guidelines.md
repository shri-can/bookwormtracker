# Design Guidelines for Book Reading Tracker

## Design Approach
**Reference-Based Approach**: Drawing inspiration from Notion and Goodreads for their excellent balance of information density and visual appeal. The app should feel scholarly yet modern, emphasizing readability and organization.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 25 20% 20% (Deep warm brown for text and primary actions)
- Secondary: 35 18% 40% (Warm medium brown for secondary text)
- Background: 35 15% 97% (Warm cream white)
- Accent: 20 85% 55% (Rich burnt orange for progress indicators)

**Dark Mode:**
- Primary: 35 15% 85% (Warm light cream for text)
- Secondary: 35 15% 65% (Medium warm gray)
- Background: 25 25% 6% (Deep warm charcoal)
- Accent: 20 75% 65% (Softer warm orange for dark mode)

### Typography
- **Primary Font**: Inter (clean, readable)
- **Accent Font**: Crimson Text (for book titles and quotes)
- **Sizes**: text-sm, text-base, text-lg, text-xl, text-2xl
- **Weights**: 400 (regular), 500 (medium), 600 (semibold)

### Layout System
**Spacing Units**: Use Tailwind units of 2, 4, 6, 8, and 12 consistently
- Tight spacing: p-2, m-2
- Standard spacing: p-4, m-4, gap-4
- Section spacing: p-6, m-6
- Page spacing: p-8, m-8
- Large spacing: p-12, m-12

### Component Library

**Navigation**
- Sidebar navigation with icons and labels
- Sections: My Library, Currently Reading, Progress, Notes
- Clean, minimal design with subtle hover states

**Book Cards**
- Compact cards showing cover placeholder, title, author, genre
- Progress bars for currently reading books
- "Usefulness" rating display
- Clean typography hierarchy

**Data Displays**
- Reading statistics dashboard with cards
- Progress tracking with visual indicators
- Time estimates with clear typography
- Notes section with comfortable reading spacing

**Forms**
- Clean input fields with proper labeling
- Genre dropdown/tags
- Rating systems for usefulness
- Text areas for notes with good line height

**Overlays**
- Modal dialogs for adding/editing books
- Simple, focused design
- Proper backdrop blur

### Visual Hierarchy
- Book titles prominently displayed in Crimson Text
- Clear separation between sections
- Generous whitespace for comfortable reading
- Subtle shadows and borders for card separation

### Interaction Design
- Hover states on interactive elements
- Smooth transitions (duration-200)
- Clear visual feedback for actions
- Accessible focus states

## Key Design Principles
1. **Reading-First**: Design optimized for text consumption and note-taking
2. **Information Clarity**: Clear hierarchy for book data and progress
3. **Minimal Distraction**: Clean interface that doesn't compete with content
4. **Progress Emphasis**: Visual progress indicators are prominent but not overwhelming
5. **Scholarly Aesthetic**: Professional appearance suitable for serious readers

## Images
No hero images required. Use simple book cover placeholders (rectangles with subtle gradients) and minimal iconography from Heroicons for navigation and actions.