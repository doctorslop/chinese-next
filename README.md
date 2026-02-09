# ChineseDictionary

A minimalist Chinese-English dictionary web application built with Next.js and SQLite, containing over 120,000 entries from the CC-CEDICT dataset. Search by English, Chinese characters, or Pinyin with advanced query operators, study HSK vocabulary with flashcards, and hear native pronunciation — all in a fast, offline-capable PWA.

## Overview

ChineseDictionary is designed for quick, frictionless lookups. Type in any format — English words, simplified or traditional Chinese characters, or Pinyin (with or without tone numbers) — and the search engine automatically detects the input type and returns relevant results. The entire search pipeline runs server-side using SQLite with FTS5 full-text indexing, so initial page loads contain fully rendered HTML with no client-side fetching required.

Beyond basic lookups, the app supports wildcard matching, term exclusion, field-specific queries, exact phrase matching, and combinable operators. When a multi-character Chinese query has no exact match, the app automatically segments it into individual characters and shows results for each. A "did you mean" system catches typos with edit-distance suggestions.

The application also includes an HSK 3.0 flashcard study system covering all 7 levels (over 11,000 words total), a light/dark theme toggle, click-to-play audio pronunciation for every Pinyin syllable, and full PWA support for offline use.

## Features

- **Multi-format search**: English words, Chinese characters (simplified and traditional), or Pinyin
- **Flexible Pinyin input**: With or without tone numbers (`nihao` and `ni3hao3` both work)
- **Advanced search operators**: Wildcards (`*`), exclusion (`-`), field-specific (`c:`, `p:`, `e:`), exact phrase (`"..."`)
- **Tone-marked Pinyin display**: All results render proper diacritics (nǐ hǎo)
- **Audio pronunciation**: Click any Pinyin syllable to hear it spoken
- **Character segmentation**: Automatic character-by-character breakdown when no exact match is found
- **"Did you mean" suggestions**: Edit-distance-based typo correction
- **HSK 3.0 flashcards**: Study vocabulary for HSK levels 1–6 and 7–9 with keyboard shortcuts
- **Light/dark theme**: Persisted preference with system-default detection
- **PWA support**: Service worker with offline caching for use without a network connection
- **JSON API**: Programmatic access to search results with rate limiting
- **Debug mode**: Append `?debug=1` to inspect SQL queries, parsing tokens, and execution timing
- **Mobile-friendly**: Responsive layout with touch support

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd chinese-next
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Download and import dictionary data:
   ```bash
   # Place cedict_ts.u8 in data/ directory, then:
   npm run import
   ```
   This parses CC-CEDICT and populates the SQLite database with ~120,000 entries, including pre-computed Pinyin display and search variants.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser.

## Audio Setup

Audio files go in `public/audio/` with the naming convention:

```
{syllable}{tone}.mp3
```

Examples: `ni3.mp3`, `hao3.mp3`, `zhong1.mp3`

Each Pinyin syllable in search results is rendered as a clickable link that plays the corresponding audio file.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** (App Router) | Framework with server and client components |
| **React 19** | UI rendering |
| **TypeScript** | Type safety throughout |
| **SQLite** (better-sqlite3) | Dictionary storage with FTS5 full-text search |
| **Turbopack** | Development server bundler |
| **Vanilla CSS** | Styling with light/dark theme variables |
| **Service Worker** | PWA offline caching |

## Project Structure

```
chinese-next/
├── app/                              # Next.js App Router pages
│   ├── layout.tsx                    # Root layout (nav, theme, PWA registration)
│   ├── page.tsx                      # Home page with search bar and examples
│   ├── globals.css                   # All styles (light/dark themes)
│   ├── search/page.tsx               # Search results (Server Component)
│   ├── hsk/                          # HSK flashcard feature
│   │   ├── page.tsx                  # Level selection grid
│   │   └── [level]/page.tsx          # Flashcard study interface
│   ├── help/page.tsx                 # Search syntax documentation
│   ├── about/page.tsx                # About page with entry count
│   ├── api/search/route.ts           # JSON API endpoint (rate-limited)
│   ├── error.tsx                     # Error boundary
│   └── not-found.tsx                 # 404 page
│
├── lib/                              # Core business logic
│   ├── db.ts                         # SQLite database (singleton, WAL mode)
│   ├── search.ts                     # Search engine with query parsing
│   ├── pinyin.ts                     # Pinyin tone mark/number conversion
│   ├── parser.ts                     # CC-CEDICT line parser
│   └── constants.ts                  # Page size, max query length, etc.
│
├── components/                       # React components
│   ├── SearchForm.tsx                # Search input (Client Component)
│   ├── EntryList.tsx                 # Dictionary entry display
│   ├── AudioLink.tsx                 # Clickable Pinyin with audio playback
│   ├── Pagination.tsx                # Page navigation
│   ├── Suggestions.tsx               # "Did you mean" links
│   ├── SegmentedResults.tsx          # Character-by-character breakdown
│   ├── StatsPanel.tsx                # Debug info panel (collapsible)
│   ├── Flashcard.tsx                 # Single flashcard component
│   ├── FlashcardStudy.tsx            # HSK study interface with shortcuts
│   └── ThemeToggle.tsx               # Light/dark theme switcher
│
├── scripts/
│   └── import-cedict.ts              # Data import (CC-CEDICT → SQLite)
│
├── public/
│   ├── audio/                        # Pinyin pronunciation MP3 files
│   ├── data/                         # HSK vocabulary JSON (hsk1–hsk7-9)
│   ├── audio.js                      # Client-side audio playback handler
│   ├── sw.js                         # Service worker (network-first + cache)
│   ├── manifest.json                 # PWA manifest
│   └── *.png                         # App icons (192, 512, apple-touch)
│
├── data/
│   └── cedict_ts.u8                  # CC-CEDICT source data (~120K entries)
│
├── dictionary.db                     # SQLite database (generated by import)
├── next.config.ts                    # Standalone output, security headers
├── tsconfig.json                     # Strict mode, bundler resolution
└── package.json
```

## Architecture

### Server Components (default)

All pages are Server Components that call `lib/search.ts` directly — no client-side fetch needed for initial render. The search logic runs entirely server-side, and only rendered HTML is sent to the browser.

### Client Components (minimal)

Only used where browser APIs are required:
- `SearchForm` — manages input focus and form submission
- `AudioLink` — click handler for audio playback
- `FlashcardStudy` — keyboard shortcuts and shuffle state
- `ThemeToggle` — reads/writes localStorage for theme preference
- `StatsPanel` — collapsible debug panel
- `error.tsx` — Next.js error boundary (required by framework)

### Database

SQLite via `better-sqlite3` (synchronous, no async overhead):
- **Table**: `entries` with columns for traditional, simplified, pinyin (display, search, nospace), and definition
- **Indexes**: On traditional, simplified, pinyin_search, and pinyin_nospace for fast LIKE queries
- **FTS5**: Virtual table with INSERT/UPDATE/DELETE triggers for full-text search
- **WAL mode**: Write-Ahead Logging for concurrent read access
- **Pagination**: SQL `LIMIT/OFFSET` with a +1 row trick to detect whether a next page exists

### Search Pipeline

1. **Detect** input type — English, Chinese, or Pinyin
2. **Parse** query into tokens with support for fields, exclusions, wildcards, and phrases
3. **Build** SQL WHERE clause with parameterized LIKE patterns (injection-safe)
4. **Order** by relevance — exact matches first, then by entry length
5. **Paginate** with LIMIT+1 trick; up to 50 results per page, max 100 pages
6. **Fallback** — if no results for multi-character Chinese, segment and search each character

### Pinyin System

- Converts between tone numbers (`ni3`) and tone marks (`nǐ`) using vowel placement rules
- Normalizes `v` to `ü` for display
- Generates audio file paths from syllable+tone combinations
- Pre-computes `pinyin_search` (with tone numbers) and `pinyin_nospace` (compressed) variants at import time

## HSK Flashcard Study

The `/hsk` route provides a flashcard study system for the HSK 3.0 vocabulary standard:

| Level | Words |
|-------|-------|
| HSK 1 | 497 |
| HSK 2 | 764 |
| HSK 3 | 966 |
| HSK 4 | 995 |
| HSK 5 | 1,067 |
| HSK 6 | 1,134 |
| HSK 7–9 | 5,619 |

**Keyboard shortcuts** in study mode:

| Key | Action |
|-----|--------|
| `Space` / `Enter` | Flip card |
| `→` / `J` | Next card |
| `←` / `K` | Previous card |
| `S` | Toggle shuffle |
| `P` | Play audio |

Cards show simplified characters, traditional characters, Pinyin with tone marks, and English definitions. Progress is displayed as a counter (e.g., "42 / 497").

## Search Syntax

### Basic Search
- `hello` — Search English definitions
- `你好` — Search Chinese characters
- `nihao` or `ni3hao3` — Search by Pinyin

### Advanced Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `*` | `chin*`, `*文`, `b*g` | Wildcard — zero or more characters |
| `-` | `apple -phone` | Exclude results containing term |
| `c:` | `c:好` | Search Chinese headwords only |
| `p:` | `p:you` | Search Pinyin only |
| `e:` | `e:hello` | Search English definitions only |
| `"..."` | `"to use"` | Exact phrase match |

Operators combine freely: `c:好 e:good`, `e:"thank you"`, `-"to use"`

## API

### GET /api/search

JSON endpoint for programmatic access. Rate-limited to 60 requests per minute per IP.

**Parameters:**
- `q` (required) — Search query (max 200 characters)
- `page` (optional, default 1) — Page number (1–100)
- `debug` (optional) — Set to `1` for SQL/timing info

**Response:**
```json
{
  "query": "hello",
  "results": [...],
  "result_count": 50,
  "suggestions": [],
  "segmented_results": null,
  "page": 1,
  "has_next": true,
  "has_prev": false
}
```

## Scripts

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build (standalone)
npm run start     # Start production server
npm run import    # Import CC-CEDICT data into SQLite
npm run lint      # Run ESLint
```

## Data Source

Dictionary data is sourced from [CC-CEDICT](https://cc-cedict.org/), a collaborative Chinese-English dictionary project released under the Creative Commons Attribution-ShareAlike license.

## License

MIT License (application code)

CC-CEDICT data is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
