# ChineseDictionary.cc Clone - Architecture Plan

## Overview
A minimalist Chinese-English dictionary web application replicating ChineseDictionary.cc functionality.

## Tech Stack
- **Backend**: Python 3 + Flask (lightweight, server-rendered)
- **Database**: SQLite with FTS5 for full-text search
- **Frontend**: Vanilla HTML/CSS + minimal JavaScript (audio playback only)
- **Data Source**: CC-CEDICT format dictionary

## Data Model

### Dictionary Entry Schema
```
CREATE TABLE entries (
    id INTEGER PRIMARY KEY,
    traditional TEXT NOT NULL,
    simplified TEXT NOT NULL,
    pinyin TEXT NOT NULL,           -- with tone numbers: "ni3 hao3"
    pinyin_display TEXT NOT NULL,   -- with tone marks: "nǐ hǎo"
    pinyin_search TEXT NOT NULL,    -- normalized for search: "nihao"
    definition TEXT NOT NULL
);
```

### FTS5 Virtual Table for Search
```
CREATE VIRTUAL TABLE entries_fts USING fts5(
    traditional,
    simplified,
    pinyin_search,
    definition,
    content='entries',
    content_rowid='id'
);
```

## Search Engine Design

### Query Parsing
1. Tokenize query into terms
2. Identify operators: `*`, `-`, `c:`, `p:`, `e:`, quoted phrases
3. Build SQL query dynamically

### Operator Implementation
| Operator | Description | SQL Approach |
|----------|-------------|--------------|
| `*` wildcard | Zero or more chars | LIKE with % |
| `-term` | Exclude | AND NOT |
| `c:term` | Chinese field only | Search traditional/simplified only |
| `p:term` | Pinyin field only | Search pinyin_search only |
| `e:term` | English field only | Search definition only |
| `"phrase"` | Exact phrase | FTS5 phrase query |

### Did You Mean
- For English terms: Use Levenshtein distance against common words
- Fuzzy matching with edit distance threshold

## Routing

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Home page with search bar |
| `/search` | GET | Results page (`?q=query`) |
| `/help` | GET | Help page |
| `/about` | GET | About page |
| `/contact` | GET/POST | Contact form |
| `/audio/<syllable>` | GET | Serve audio file |

## Audio System
- Pre-recorded syllables stored as MP3 files
- Naming convention: `{pinyin}{tone}.mp3` (e.g., `zhong1.mp3`)
- ~1300 unique syllable+tone combinations
- Click handler plays audio via HTML5 Audio API

## Directory Structure
```
chinesedictionary/
├── app.py                 # Flask application
├── search.py              # Search engine
├── parser.py              # CC-CEDICT parser
├── database.py            # Database operations
├── pinyin_utils.py        # Pinyin conversion utilities
├── static/
│   ├── css/
│   │   └── style.css      # Minimal styles
│   ├── js/
│   │   └── audio.js       # Audio click handler
│   └── audio/             # Syllable audio files
├── templates/
│   ├── base.html          # Base template with nav
│   ├── home.html          # Home page
│   ├── results.html       # Search results
│   ├── help.html          # Help page
│   ├── about.html         # About page
│   └── contact.html       # Contact form
├── data/
│   └── cedict_ts.u8       # CC-CEDICT data file
├── dictionary.db          # SQLite database
├── requirements.txt       # Python dependencies
└── README.md              # Deployment instructions
```

## Entry Display Format
```
Traditional|Simplified [Pinyin] Definition
簡·愛|简·爱 [Jiǎn Ài] Jane Eyre
```

- If traditional == simplified, show only one form
- Pinyin syllables are clickable links for audio
- Definition preserves CC-CEDICT annotations (CL:, notes, etc.)

## Performance Considerations
- SQLite FTS5 provides fast full-text search
- Server-rendered pages minimize client-side complexity
- Minimal CSS/JS for fast load times
- No pagination (all results on one page, may be long scroll)

## Implementation Order
1. Pinyin utilities (tone number ↔ tone mark conversion)
2. CC-CEDICT parser
3. Database setup and data import
4. Search engine with all operators
5. Flask routes and templates
6. Audio system
7. Did You Mean suggestions
8. Contact form
9. Testing and verification
