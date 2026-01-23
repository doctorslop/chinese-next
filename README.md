# ChineseDictionary

A minimalist Chinese-English dictionary web application built with Next.js (App Router).

## Features

- **Search by multiple formats**: English words, Chinese characters, or Mandarin Pinyin
- **Flexible Pinyin input**: With or without tone numbers (both `nihao` and `ni3hao3` work)
- **Advanced search operators**:
  - Wildcard (`*`) for partial matching
  - Exclusion (`-`) to filter out terms
  - Field-specific search (`c:`, `p:`, `e:`)
  - Exact phrase matching with quotes
- **Tone-marked Pinyin display**: All results show proper tone diacritics
- **Audio pronunciation**: Click any Pinyin syllable to hear it
- **Both character sets**: Simplified and Traditional Chinese
- **"Did you mean" suggestions**: Helpful when you mistype
- **Debug mode**: Append `?debug=1` to see SQL, timing, and token info
- **Clean, minimal design**: Fast loading, mobile-friendly

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
   This imports CC-CEDICT (~120,000 entries) into the SQLite database.

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

## Project Structure

```
chinese-next/
├── app/
│   ├── layout.tsx             # Root layout with navigation
│   ├── page.tsx               # Home page with search bar
│   ├── globals.css            # All styles
│   ├── not-found.tsx          # 404 page
│   ├── error.tsx              # Error boundary
│   ├── search/page.tsx        # Search results (Server Component)
│   ├── help/page.tsx          # Search syntax help
│   ├── about/page.tsx         # About page with entry count
│   └── api/search/route.ts    # JSON API endpoint
├── lib/
│   ├── db.ts                  # SQLite database (better-sqlite3)
│   ├── search.ts              # Search engine with query parsing
│   ├── pinyin.ts              # Pinyin conversion utilities
│   ├── parser.ts              # CC-CEDICT format parser
│   └── constants.ts           # Shared configuration
├── components/
│   ├── SearchForm.tsx         # Search input (Client Component)
│   ├── EntryList.tsx          # Dictionary entry display
│   ├── AudioLink.tsx          # Pinyin audio click handler
│   ├── Pagination.tsx         # Previous/Next page links
│   ├── Suggestions.tsx        # "Did you mean" links
│   ├── SegmentedResults.tsx   # Character breakdown display
│   └── StatsPanel.tsx         # Debug info panel
├── scripts/
│   └── import-cedict.ts       # Data import script
├── public/
│   ├── audio.js               # Audio playback handler
│   └── audio/                 # Pinyin MP3 files
├── data/
│   └── cedict_ts.u8           # CC-CEDICT data (downloaded)
├── dictionary.db              # SQLite database (generated)
├── next.config.js
├── tsconfig.json
└── package.json
```

## Architecture

### Server Components (default)

All pages are Server Components that call `lib/search.ts` directly — no client-side fetch needed for initial render. This keeps the search logic server-side and sends only HTML to the client.

### Client Components (minimal)

Only used where browser APIs are required:
- `SearchForm` — autofocus on the input
- `AudioLink` — click handler for audio playback
- `StatsPanel` — collapsible debug panel
- `error.tsx` — Next.js error boundary (required)

### Database

SQLite with `better-sqlite3` (synchronous, no async overhead):
- **Table**: `entries` with 7 columns
- **Indexes**: `traditional`, `simplified`, `pinyin_search`, `pinyin_nospace`
- **FTS5**: Virtual table for full-text search with sync triggers
- **Pagination**: SQL `LIMIT/OFFSET` — no fetch-all-then-slice

### Search Pipeline

1. **Parse** query into tokens (field, exclude, wildcard, phrase)
2. **Build** SQL WHERE clause with LIKE patterns
3. **Order** by relevance (exact match first, then by length)
4. **Paginate** with LIMIT+1 trick to detect next page

## Search Syntax

### Basic Search
- `hello` — Search English definitions
- `你好` — Search Chinese characters
- `nihao` or `ni3hao3` — Search by Pinyin

### Advanced Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `*` | `chin*`, `*文`, `b*g` | Wildcard (zero or more chars) |
| `-` | `apple -phone` | Exclude term |
| `c:` | `c:好` | Search Chinese headwords only |
| `p:` | `p:you` | Search Pinyin only |
| `e:` | `e:hello` | Search English definitions only |
| `"..."` | `"to use"` | Exact phrase match |

Operators can be combined: `c:好 e:good`, `e:"thank you"`, `-"to use"`

## API

### GET /api/search

JSON endpoint for programmatic access.

**Parameters:**
- `q` (required) — Search query (max 200 chars)
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
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run import    # Import CC-CEDICT data
```

## Data Source

Dictionary data is sourced from [CC-CEDICT](https://cc-cedict.org/), a collaborative Chinese-English dictionary project released under the Creative Commons Attribution-ShareAlike license.

## License

MIT License (application code)

CC-CEDICT data is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
