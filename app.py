"""
Flask application for ChineseDictionary.cc clone.
Server-rendered pages with minimal JavaScript.
"""

import os
from flask import Flask, render_template, request, redirect, url_for, send_from_directory, flash
from search import search, get_suggestions, segment_chinese
from pinyin_utils import extract_pinyin_syllables, get_audio_filename, is_chinese
from database import get_entry_count, init_database

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Example queries shown on homepage
EXAMPLE_QUERIES = [
    ('hello', 'English word'),
    ('nihao', 'Pinyin without tones'),
    ('ni3hao3', 'Pinyin with tone numbers'),
    ('chinese *文', 'Wildcard search'),
    ('"to use"', 'Exact phrase'),
    ('apple -phone', 'Exclude term'),
]


def format_entry_display(entry):
    """
    Format an entry for display.
    Returns dict with formatted fields.
    """
    trad = entry['traditional']
    simp = entry['simplified']

    # Show only simplified characters
    headword = simp

    # Extract pinyin syllables for clickable audio
    syllables = extract_pinyin_syllables(entry['pinyin'])

    return {
        'id': entry['id'],
        'headword': headword,
        'traditional': trad,
        'simplified': simp,
        'pinyin': entry['pinyin'],
        'pinyin_display': entry['pinyin_display'],
        'syllables': syllables,  # List of (pinyin_numbered, pinyin_display)
        'definition': entry['definition'],
    }


@app.route('/')
def home():
    """Home page with search bar."""
    return render_template('home.html', examples=EXAMPLE_QUERIES)


RESULTS_PER_PAGE = 50
MAX_QUERY_LENGTH = 200


@app.route('/search')
def search_results():
    """Search results page."""
    query = request.args.get('q', '').strip()

    if not query:
        return redirect(url_for('home'))

    # Input validation - limit query length
    if len(query) > MAX_QUERY_LENGTH:
        query = query[:MAX_QUERY_LENGTH]

    # Get page number (default to 1)
    try:
        page = max(1, int(request.args.get('page', 1)))
    except (ValueError, TypeError):
        page = 1

    # Limit page number to prevent abuse
    if page > 100:
        page = 100

    try:
        # Perform search using SQL OFFSET/LIMIT - fetch one extra to detect next page
        offset = (page - 1) * RESULTS_PER_PAGE
        page_results = search(query, limit=RESULTS_PER_PAGE + 1, offset=offset)

        has_next = len(page_results) > RESULTS_PER_PAGE
        has_prev = page > 1

        # Trim the extra result used for next-page detection
        if has_next:
            page_results = page_results[:RESULTS_PER_PAGE]

        total_results = len(page_results)

        # Format results for display
        formatted_results = [format_entry_display(r) for r in page_results]

        # Check if this is Chinese text that could be segmented
        # Segment if: no exact results AND query contains Chinese characters AND query length > 1
        segmented_results = None
        chinese_chars = ''.join(c for c in query if is_chinese(c))

        if total_results == 0 and len(chinese_chars) > 1:
            # Try to segment the Chinese text
            segments = segment_chinese(query)
            if segments:
                # Format segmented results
                segmented_results = []
                for word, entries in segments:
                    formatted_entries = [format_entry_display(e) for e in entries]
                    segmented_results.append({
                        'word': word,
                        'entries': formatted_entries,
                    })

        # Get suggestions if no results or few results (and not segmented)
        suggestions = []
        if total_results < 5 and not segmented_results:
            suggestions = get_suggestions(query, limit=8)
            # Remove the query itself from suggestions
            suggestions = [s for s in suggestions if s.lower() != query.lower()]

        return render_template(
            'results.html',
            query=query,
            results=formatted_results,
            suggestions=suggestions,
            result_count=total_results,
            segmented_results=segmented_results,
            page=page,
            has_next=has_next,
            has_prev=has_prev,
        )
    except Exception as e:
        # Log the error (in production, use proper logging)
        app.logger.error(f"Search error for query '{query}': {e}")
        flash('An error occurred while searching. Please try again.', 'error')
        return render_template(
            'results.html',
            query=query,
            results=[],
            suggestions=[],
            result_count=0,
            segmented_results=None,
            page=1,
            has_next=False,
            has_prev=False,
        )


@app.route('/help')
def help_page():
    """Help page with search syntax documentation."""
    return render_template('help.html')


@app.route('/about')
def about():
    """About page."""
    try:
        entry_count = get_entry_count()
    except Exception:
        entry_count = 0
    return render_template('about.html', entry_count=entry_count)


@app.errorhandler(404)
def page_not_found(e):
    """Handle 404 errors."""
    return render_template('base.html', error_message='Page not found'), 404


@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors."""
    return render_template('base.html', error_message='An internal error occurred'), 500


@app.route('/audio/<path:filename>')
def serve_audio(filename):
    """Serve audio files for pinyin syllables."""
    audio_dir = os.path.join(app.static_folder, 'audio')
    return send_from_directory(audio_dir, filename)


@app.template_filter('audio_file')
def audio_file_filter(pinyin_numbered):
    """Template filter to get audio filename for a pinyin syllable."""
    return get_audio_filename(pinyin_numbered)


@app.context_processor
def utility_processor():
    """Add utility functions to template context."""
    return {
        'get_audio_filename': get_audio_filename,
    }


# Initialize database on startup
@app.before_request
def ensure_db():
    """Ensure database is initialized."""
    if not hasattr(app, '_db_initialized'):
        init_database()
        app._db_initialized = True


if __name__ == '__main__':
    # Initialize database
    init_database()

    # Run development server
    app.run(debug=True, host='0.0.0.0', port=5000)
