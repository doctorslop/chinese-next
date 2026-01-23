# ChineseDictionary

A minimalist Chinese-English dictionary web application, replicating the functionality of ChineseDictionary.cc.

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
- **Clean, minimal design**: Fast loading, mobile-friendly

## Quick Start

### Prerequisites

- Python 3.8+
- pip

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd chinesedictionary
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Download and import dictionary data:
   ```bash
   python scripts/import_cedict.py
   ```
   This will automatically download CC-CEDICT (~120,000 entries) and import it into the SQLite database.

5. (Optional) Set up audio files:
   ```bash
   python scripts/generate_audio_manifest.py --create-placeholders
   ```
   Note: For actual audio, you'll need to provide MP3 files for each Pinyin syllable. See "Audio Setup" below.

6. Run the application:
   ```bash
   python app.py
   ```

7. Open http://localhost:5000 in your browser.

## Audio Setup

The dictionary supports per-syllable audio pronunciation. Audio files should be placed in `static/audio/` with the naming convention:

```
{syllable}{tone}.mp3
```

Examples: `ni3.mp3`, `hao3.mp3`, `zhong1.mp3`

Options for obtaining audio files:
1. **TTS Generation**: Use a text-to-speech service to generate audio for each syllable
2. **Existing Resources**: Some open-source Mandarin audio libraries exist
3. **Record manually**: For highest quality, record native speaker pronunciations

The `scripts/generate_audio_manifest.py` script creates a JSON manifest of all required files (~1300 syllable+tone combinations).

## Project Structure

```
chinesedictionary/
├── app.py                 # Flask application
├── search.py              # Search engine with query parsing
├── parser.py              # CC-CEDICT format parser
├── database.py            # SQLite database operations
├── pinyin_utils.py        # Pinyin conversion utilities
├── static/
│   ├── css/style.css      # Minimal stylesheet
│   ├── js/audio.js        # Audio click handler
│   └── audio/             # Pinyin audio files (MP3)
├── templates/
│   ├── base.html          # Base template with navigation
│   ├── home.html          # Home page with search bar
│   ├── results.html       # Search results display
│   ├── help.html          # Search syntax documentation
│   ├── about.html         # About page
│   └── contact.html       # Contact form
├── scripts/
│   ├── import_cedict.py   # Data import script
│   └── generate_audio_manifest.py
├── data/
│   └── cedict_ts.u8       # CC-CEDICT data (downloaded)
├── dictionary.db          # SQLite database (generated)
└── requirements.txt
```

## Search Syntax

### Basic Search
- `hello` - Search English definitions
- `你好` - Search Chinese characters
- `nihao` or `ni3hao3` - Search by Pinyin

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

## Configuration

Environment variables:
- `SECRET_KEY`: Flask secret key (set in production)

## Deployment

### Production with Gunicorn

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY . .
RUN python scripts/import_cedict.py
EXPOSE 8000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:app"]
```

### Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name dictionary.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static {
        alias /path/to/chinesedictionary/static;
        expires 7d;
    }
}
```

## Data Source

Dictionary data is sourced from [CC-CEDICT](https://cc-cedict.org/), a collaborative Chinese-English dictionary project released under the Creative Commons Attribution-ShareAlike license.

## License

MIT License (application code)

CC-CEDICT data is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
