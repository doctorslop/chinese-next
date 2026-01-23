"""
CC-CEDICT format parser.
Format: Traditional Simplified [pinyin] /definition1/definition2/.../
"""

import re
from pinyin_utils import convert_pinyin_display, normalize_pinyin_input


def parse_cedict_line(line):
    """
    Parse a single CC-CEDICT line.
    Returns dict with traditional, simplified, pinyin, pinyin_display, pinyin_search, definition
    or None if line is a comment or invalid.
    """
    line = line.strip()

    # Skip comments and empty lines
    if not line or line.startswith('#'):
        return None

    # CC-CEDICT format: Traditional Simplified [pinyin] /definitions/
    # Example: 你好 你好 [ni3 hao3] /hello/hi/how are you?/
    match = re.match(
        r'^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+/(.+)/$',
        line
    )

    if not match:
        return None

    traditional = match.group(1)
    simplified = match.group(2)
    pinyin_raw = match.group(3)  # e.g., "ni3 hao3"
    definitions_raw = match.group(4)  # e.g., "hello/hi/how are you?"

    # Convert pinyin to display format (with tone marks)
    pinyin_display = convert_pinyin_display(pinyin_raw)

    # Normalize pinyin for search (no tones)
    pinyin_search = normalize_pinyin_input(pinyin_raw)

    # Join definitions with semicolons (as per spec, use / or ; to separate)
    definitions = definitions_raw.replace('/', ' / ')

    return {
        'traditional': traditional,
        'simplified': simplified,
        'pinyin': pinyin_raw,
        'pinyin_display': pinyin_display,
        'pinyin_search': pinyin_search,
        'definition': definitions,
    }


def parse_cedict_file(filepath):
    """
    Parse an entire CC-CEDICT file.
    Yields entry dicts.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            entry = parse_cedict_line(line)
            if entry:
                yield entry


def count_entries(filepath):
    """
    Count the number of valid entries in a CC-CEDICT file.
    """
    count = 0
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if parse_cedict_line(line):
                count += 1
    return count
