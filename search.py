"""
Advanced search engine implementing all query operators:
- Wildcard (*) searches
- Exclusion (-) operator
- Field prefixes (c:, p:, e:)
- Quoted phrase matching
- Chinese text segmentation (character breakdown)
"""

import re
import sqlite3
import threading
from pinyin_utils import normalize_pinyin_input, is_chinese, is_pinyin
from database import get_connection

# Thread-local storage for database connections
_thread_local = threading.local()


class SearchEngine:
    """
    Search engine for the Chinese dictionary.
    Supports complex query syntax.
    """

    def __init__(self):
        self._word_set = None

    def _get_conn(self):
        """Get a thread-local database connection."""
        if not hasattr(_thread_local, 'conn') or _thread_local.conn is None:
            _thread_local.conn = get_connection()
        return _thread_local.conn

    def close(self):
        """Close the thread-local connection."""
        if hasattr(_thread_local, 'conn') and _thread_local.conn:
            _thread_local.conn.close()
            _thread_local.conn = None

    def parse_query(self, query):
        """
        Parse query into structured tokens.
        Returns list of dicts with:
        - term: the search term
        - field: None, 'chinese', 'pinyin', or 'english'
        - exclude: bool
        - wildcard: bool
        - phrase: bool (exact phrase match)
        """
        tokens = []
        query = query.strip()

        # Regex to match tokens:
        # - Quoted phrases: "..."
        # - Field prefixes: c:, p:, e:
        # - Exclusion: -
        # - Regular terms
        pattern = r'''
            (-)?                    # Optional exclusion prefix
            (c:|p:|e:)?             # Optional field prefix
            (?:
                "([^"]+)"           # Quoted phrase
                |
                (\S+)               # Regular term
            )
        '''

        for match in re.finditer(pattern, query, re.VERBOSE):
            exclude = bool(match.group(1))
            field_prefix = match.group(2)
            phrase = match.group(3)
            term = match.group(4)

            if phrase:
                actual_term = phrase
                is_phrase = True
            elif term:
                actual_term = term
                is_phrase = False
            else:
                continue

            # Determine field
            field = None
            if field_prefix:
                if field_prefix == 'c:':
                    field = 'chinese'
                elif field_prefix == 'p:':
                    field = 'pinyin'
                elif field_prefix == 'e:':
                    field = 'english'

            # Check for wildcard
            has_wildcard = '*' in actual_term

            tokens.append({
                'term': actual_term,
                'field': field,
                'exclude': exclude,
                'wildcard': has_wildcard,
                'phrase': is_phrase,
            })

        return tokens

    def _build_wildcard_pattern(self, term):
        """Convert wildcard pattern to SQL LIKE pattern."""
        # Escape SQL special characters first
        term = term.replace('%', r'\%').replace('_', r'\_')
        # Then convert * to %
        return term.replace('*', '%')

    def _build_condition(self, token):
        """
        Build SQL condition for a token.
        Returns (condition_sql, params) tuple.
        """
        term = token['term']
        field = token['field']
        exclude = token['exclude']
        wildcard = token['wildcard']
        phrase = token['phrase']

        conditions = []
        params = []

        # Determine which fields to search
        if field == 'chinese':
            fields = ['traditional', 'simplified']
        elif field == 'pinyin':
            fields = ['pinyin_search']
            # Normalize pinyin term for search
            term = normalize_pinyin_input(term)
        elif field == 'english':
            fields = ['definition']
        else:
            # Auto-detect based on content
            if is_chinese(term.replace('*', '')):
                fields = ['traditional', 'simplified']
            elif is_pinyin(term.replace('*', '')):
                fields = ['pinyin_search', 'traditional', 'simplified', 'definition']
                # Also search with normalized pinyin
            else:
                fields = ['definition', 'traditional', 'simplified', 'pinyin_search']

        # Build the condition
        if wildcard:
            pattern = self._build_wildcard_pattern(term)
            field_conditions = []
            for f in fields:
                if f == 'pinyin_search':
                    # Normalize the search pattern for pinyin (remove tones and spaces)
                    # Use \x00 as placeholder since it won't appear in pinyin
                    normalized_pattern = self._build_wildcard_pattern(
                        normalize_pinyin_input(term.replace('*', '\x00')).replace(' ', '').replace('\x00', '*')
                    )
                    # Use pre-computed pinyin_nospace column (indexed)
                    field_conditions.append(f"pinyin_nospace LIKE ? ESCAPE '\\'")
                    params.append(normalized_pattern)
                else:
                    field_conditions.append(f"{f} LIKE ? ESCAPE '\\'")
                    params.append(pattern)

            condition = f"({' OR '.join(field_conditions)})"
        elif phrase:
            # Exact phrase match - use LIKE with the phrase
            field_conditions = []
            for f in fields:
                field_conditions.append(f"{f} LIKE ? ESCAPE '\\'")
                params.append(f'%{term}%')
            condition = f"({' OR '.join(field_conditions)})"
        else:
            # Regular term match
            field_conditions = []
            for f in fields:
                if f == 'pinyin_search':
                    # Normalize pinyin for comparison (remove tones and spaces)
                    normalized = normalize_pinyin_input(term).replace(' ', '')
                    # Use starts-with matching to avoid cross-syllable substring matches
                    # (e.g., "nihao" should not match "tiedanihao")
                    field_conditions.append(f"pinyin_nospace LIKE ? ESCAPE '\\'")
                    params.append(f'{normalized}%')
                else:
                    field_conditions.append(f"{f} LIKE ? ESCAPE '\\'")
                    params.append(f'%{term}%')
            condition = f"({' OR '.join(field_conditions)})"

        if exclude:
            condition = f"NOT {condition}"

        return condition, params

    def search(self, query, limit=500, offset=0):
        """
        Execute a search query.
        Returns list of entry dicts.
        """
        if not query or not query.strip():
            return []

        tokens = self.parse_query(query)
        if not tokens:
            return []

        conn = self._get_conn()
        cursor = conn.cursor()

        # Build WHERE clause
        conditions = []
        all_params = []

        # Separate include and exclude tokens
        include_tokens = [t for t in tokens if not t['exclude']]
        exclude_tokens = [t for t in tokens if t['exclude']]

        # Process include tokens (AND together)
        for token in include_tokens:
            cond, params = self._build_condition(token)
            conditions.append(cond)
            all_params.extend(params)

        # Process exclude tokens
        for token in exclude_tokens:
            cond, params = self._build_condition(token)
            conditions.append(cond)
            all_params.extend(params)

        if not conditions:
            return []

        where_clause = ' AND '.join(conditions)

        # Build relevance ordering based on query type
        # Exact matches should come before substring matches
        order_clauses = []
        order_params = []

        # Detect query type for smart ordering
        for token in include_tokens:
            if not token['exclude']:
                term = token['term'].replace('*', '')
                if token['field'] == 'pinyin' or is_pinyin(term):
                    # For pinyin: exact match first, then by length (shorter = more relevant)
                    normalized = normalize_pinyin_input(term).replace(' ', '')
                    order_clauses.append("CASE WHEN pinyin_nospace = ? THEN 0 ELSE 1 END")
                    order_params.append(normalized)
                    order_clauses.append("LENGTH(pinyin_search)")
                elif token['field'] == 'chinese' or is_chinese(term):
                    # For Chinese: exact match first, then by length
                    order_clauses.append("CASE WHEN traditional = ? OR simplified = ? THEN 0 ELSE 1 END")
                    order_params.extend([term, term])
                    order_clauses.append("LENGTH(traditional)")
                elif token['field'] == 'english':
                    # For English: entries starting with term first, then by definition length
                    order_clauses.append("CASE WHEN definition LIKE ? THEN 0 WHEN definition LIKE ? THEN 1 ELSE 2 END")
                    order_params.extend([f'{term}%', f'% {term}%'])
                    order_clauses.append("LENGTH(definition)")
                else:
                    # Auto-detected: prioritize shorter entries (usually more common)
                    order_clauses.append("LENGTH(traditional)")
                break  # Only use first include token for ordering

        if not order_clauses:
            order_clauses = ["traditional"]

        order_by = ', '.join(order_clauses)

        sql = f'''
            SELECT * FROM entries
            WHERE {where_clause}
            ORDER BY {order_by}
            LIMIT ? OFFSET ?
        '''
        all_params.extend(order_params)
        all_params.append(limit)
        all_params.append(offset)

        try:
            cursor.execute(sql, all_params)
            results = [dict(row) for row in cursor.fetchall()]
        except sqlite3.Error as e:
            print(f"Search error: {e}")
            results = []

        return results

    def get_suggestions(self, query, limit=8):
        """
        Get "Did you mean" suggestions for a query.
        Uses pinyin-aware edit distance for pinyin queries,
        and Levenshtein-like similarity for English words.
        """
        if not query or not query.strip():
            return []

        query = query.lower().strip()

        if is_chinese(query) or len(query) > 20:
            return []

        conn = self._get_conn()
        cursor = conn.cursor()

        # For pinyin queries, use pinyin-aware suggestions
        if is_pinyin(query):
            return self._get_pinyin_suggestions(query, cursor, limit)

        suggestions = set()

        # Strategy 1: Find words with similar prefix
        prefix = query[:3] if len(query) >= 3 else query
        cursor.execute('''
            SELECT DISTINCT definition FROM entries
            WHERE definition LIKE ?
            LIMIT 100
        ''', (f'%{prefix}%',))

        for row in cursor.fetchall():
            # Extract words from definition
            words = re.findall(r'\b[a-zA-Z]{3,}\b', row['definition'].lower())
            for word in words:
                if word != query and self._is_similar(query, word):
                    suggestions.add(word)
                    if len(suggestions) >= limit:
                        break
            if len(suggestions) >= limit:
                break

        # Strategy 2: Character transposition/substitution variants
        if len(suggestions) < limit:
            variants = self._generate_variants(query)
            for variant in variants[:10]:
                if len(suggestions) >= limit:
                    break
                cursor.execute('''
                    SELECT DISTINCT definition FROM entries
                    WHERE definition LIKE ?
                    LIMIT 3
                ''', (f'% {variant} %',))

                for row in cursor.fetchall():
                    words = re.findall(r'\b[a-zA-Z]{3,}\b', row['definition'].lower())
                    for word in words:
                        if word == variant and word != query:
                            suggestions.add(word)

        return list(suggestions)[:limit]

    def _get_pinyin_suggestions(self, query, cursor, limit=8):
        """
        Generate pinyin-aware suggestions by finding edit-distance-1 variants
        that exist as actual pinyin entries in the database.
        Prioritizes variants that share a longer prefix with the original.
        """
        normalized = normalize_pinyin_input(query).replace(' ', '')
        seen = set()

        # Generate all edit-distance-1 variants
        variants = self._generate_pinyin_variants(normalized)

        # Deduplicate and remove identity
        unique_variants = []
        for v in variants:
            if v != normalized and v not in seen and len(v) >= 2:
                seen.add(v)
                unique_variants.append(v)

        # Sort by longest shared prefix with original (prefer changes later in the word)
        def shared_prefix_len(v):
            for i in range(min(len(v), len(normalized))):
                if v[i] != normalized[i]:
                    return i
            return min(len(v), len(normalized))

        unique_variants.sort(key=shared_prefix_len, reverse=True)

        # Check which variants exist in the database
        suggestions = []
        for variant in unique_variants:
            cursor.execute('''
                SELECT 1 FROM entries
                WHERE pinyin_nospace = ?
                LIMIT 1
            ''', (variant,))

            if cursor.fetchone():
                suggestions.append(variant)
                if len(suggestions) >= limit:
                    break

        return suggestions

    def _generate_pinyin_variants(self, word):
        """Generate edit-distance-1 variants optimized for pinyin."""
        variants = []
        pinyin_chars = 'abcdefghijklmnopqrstuvwxyz'

        # Single character deletions
        for i in range(len(word)):
            variants.append(word[:i] + word[i+1:])

        # Adjacent transpositions
        for i in range(len(word) - 1):
            variants.append(word[:i] + word[i+1] + word[i] + word[i+2:])

        # Single character substitutions
        for i in range(len(word)):
            for c in pinyin_chars:
                if c != word[i]:
                    variants.append(word[:i] + c + word[i+1:])

        # Single character insertions
        for i in range(len(word) + 1):
            for c in pinyin_chars:
                variants.append(word[:i] + c + word[i:])

        return variants

    def _is_similar(self, word1, word2):
        """Check if two words are similar (simple edit distance check)."""
        if abs(len(word1) - len(word2)) > 2:
            return False

        # Simple check: same first letter and similar length
        if word1[0] == word2[0] and abs(len(word1) - len(word2)) <= 1:
            # Count matching characters
            matches = sum(1 for c1, c2 in zip(word1, word2) if c1 == c2)
            return matches >= min(len(word1), len(word2)) - 2

        return False

    def _generate_variants(self, word):
        """Generate spelling variants of a word."""
        variants = []

        # Single character deletions
        for i in range(len(word)):
            variants.append(word[:i] + word[i+1:])

        # Adjacent transpositions
        for i in range(len(word) - 1):
            variants.append(word[:i] + word[i+1] + word[i] + word[i+2:])

        # Common substitutions
        subs = {'a': 'e', 'e': 'a', 'i': 'y', 'y': 'i', 'o': 'u', 'u': 'o'}
        for i, c in enumerate(word):
            if c in subs:
                variants.append(word[:i] + subs[c] + word[i+1:])

        return variants

    def _lookup_word(self, word):
        """
        Look up a Chinese word/phrase in the dictionary.
        Returns list of matching entries (exact match on traditional or simplified).
        """
        conn = self._get_conn()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM entries
            WHERE traditional = ? OR simplified = ?
            ORDER BY traditional
        ''', (word, word))

        return [dict(row) for row in cursor.fetchall()]

    def _get_word_set(self):
        """Load all Chinese words into a set for fast existence checks."""
        if self._word_set is None:
            conn = self._get_conn()
            cursor = conn.cursor()
            cursor.execute('SELECT traditional, simplified FROM entries')
            self._word_set = set()
            for row in cursor.fetchall():
                self._word_set.add(row['traditional'])
                self._word_set.add(row['simplified'])
        return self._word_set

    def _word_exists(self, word):
        """Check if a word exists in the dictionary (fast in-memory check)."""
        return word in self._get_word_set()

    def segment_chinese(self, text, max_word_len=8):
        """
        Segment Chinese text into words using longest-match-first (greedy) algorithm.

        Returns list of tuples: (word, [entries])
        where entries is a list of dictionary entries for that word.
        If a character has no entry, entries will be empty.
        """
        if not text:
            return []

        # Filter to only Chinese characters
        chinese_chars = ''.join(c for c in text if is_chinese(c))
        if not chinese_chars:
            return []

        segments = []
        i = 0

        while i < len(chinese_chars):
            # Try to find the longest matching word starting at position i
            best_match = None
            best_len = 0

            # Try lengths from max_word_len down to 1
            for length in range(min(max_word_len, len(chinese_chars) - i), 0, -1):
                candidate = chinese_chars[i:i + length]
                if self._word_exists(candidate):
                    best_match = candidate
                    best_len = length
                    break

            if best_match:
                # Found a word in dictionary
                entries = self._lookup_word(best_match)
                segments.append((best_match, entries))
                i += best_len
            else:
                # No match found - take single character
                char = chinese_chars[i]
                entries = self._lookup_word(char)
                segments.append((char, entries))
                i += 1

        return segments


# Global search engine instance
_search_engine = None


def get_search_engine():
    """Get the global search engine instance."""
    global _search_engine
    if _search_engine is None:
        _search_engine = SearchEngine()
    return _search_engine


def search(query, limit=500, offset=0):
    """Convenience function for searching."""
    return get_search_engine().search(query, limit, offset)


def get_suggestions(query, limit=8):
    """Convenience function for getting suggestions."""
    return get_search_engine().get_suggestions(query, limit)


def segment_chinese(text):
    """Convenience function for segmenting Chinese text."""
    return get_search_engine().segment_chinese(text)
