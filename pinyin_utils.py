"""
Pinyin conversion utilities for tone numbers <-> tone marks.
Handles the 'v' -> 'ü' conversion and normalization.
"""

import re

# Tone mark mappings for each vowel
TONE_MARKS = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
}

# Reverse mapping: tone mark -> (base vowel, tone number)
TONE_MARK_TO_NUMBER = {}
for vowel, marks in TONE_MARKS.items():
    for i, mark in enumerate(marks):
        TONE_MARK_TO_NUMBER[mark] = (vowel, i + 1 if i < 4 else 5)

# All tone-marked vowels for regex
ALL_TONE_MARKS = ''.join(mark for marks in TONE_MARKS.values() for mark in marks)


def normalize_pinyin_input(text):
    """
    Normalize user input pinyin:
    - Convert 'v' to 'ü'
    - Lowercase
    - Handle both tone numbers and tone marks
    Returns normalized pinyin for search (no tones, no marks).
    """
    text = text.lower()
    text = text.replace('v', 'ü')

    # Remove tone numbers
    text = re.sub(r'[1-5]', '', text)

    # Remove tone marks by converting to base vowels
    for mark, (vowel, _) in TONE_MARK_TO_NUMBER.items():
        text = text.replace(mark, vowel)

    # Convert ü back to v for consistent storage/search
    text = text.replace('ü', 'v')

    return text


def tone_number_to_mark(syllable):
    """
    Convert a pinyin syllable with tone number to tone marks.
    E.g., 'ni3' -> 'nǐ', 'lv4' -> 'lǜ'

    Tone placement rules:
    1. If there's an 'a' or 'e', it takes the tone mark
    2. If there's 'ou', the 'o' takes the tone mark
    3. Otherwise, the second vowel takes the tone mark
    """
    syllable = syllable.lower().replace('v', 'ü')

    # Extract tone number
    match = re.match(r'^([a-züü]+)([1-5])?$', syllable)
    if not match:
        return syllable

    base = match.group(1)
    tone = int(match.group(2)) if match.group(2) else 5

    if tone == 5 or tone < 1:
        return base

    # Find the vowel to mark
    vowels = 'aeiouü'
    vowel_positions = [(i, c) for i, c in enumerate(base) if c in vowels]

    if not vowel_positions:
        return base

    # Determine which vowel gets the tone mark
    mark_pos = None

    # Rule 1: 'a' or 'e' takes the mark
    for pos, vowel in vowel_positions:
        if vowel in 'ae':
            mark_pos = pos
            break

    # Rule 2: 'ou' - 'o' takes the mark
    if mark_pos is None and 'ou' in base:
        for pos, vowel in vowel_positions:
            if vowel == 'o':
                mark_pos = pos
                break

    # Rule 3: Second vowel takes the mark
    if mark_pos is None:
        if len(vowel_positions) >= 2:
            mark_pos = vowel_positions[1][0]
        else:
            mark_pos = vowel_positions[0][0]

    # Apply the tone mark
    vowel_char = base[mark_pos]
    if vowel_char in TONE_MARKS:
        marked_vowel = TONE_MARKS[vowel_char][tone - 1]
        return base[:mark_pos] + marked_vowel + base[mark_pos + 1:]

    return base


def tone_mark_to_number(syllable):
    """
    Convert a pinyin syllable with tone marks to tone numbers.
    E.g., 'nǐ' -> 'ni3', 'lǜ' -> 'lv4'
    """
    result = []
    tone = 5

    for char in syllable:
        if char in TONE_MARK_TO_NUMBER:
            vowel, t = TONE_MARK_TO_NUMBER[char]
            result.append(vowel)
            if t < 5:
                tone = t
        else:
            result.append(char)

    base = ''.join(result).replace('ü', 'v')
    if tone < 5:
        return base + str(tone)
    return base


def convert_pinyin_display(pinyin_with_numbers):
    """
    Convert full pinyin string with tone numbers to display format.
    E.g., 'ni3 hao3' -> 'nǐ hǎo'
    """
    syllables = pinyin_with_numbers.split()
    return ' '.join(tone_number_to_mark(s) for s in syllables)


def extract_pinyin_syllables(pinyin_with_numbers):
    """
    Extract individual syllables from pinyin string.
    Returns list of (syllable_with_number, syllable_display) tuples.
    E.g., 'ni3 hao3' -> [('ni3', 'nǐ'), ('hao3', 'hǎo')]
    """
    syllables = pinyin_with_numbers.split()
    return [(s, tone_number_to_mark(s)) for s in syllables]


def get_audio_filename(syllable_with_number):
    """
    Get the audio filename for a pinyin syllable.
    E.g., 'ni3' -> 'ni3.mp3'
    """
    # Normalize: lowercase, v for ü
    syllable = syllable_with_number.lower().replace('ü', 'v')
    # Ensure tone number
    if not re.search(r'[1-5]$', syllable):
        syllable += '5'  # neutral tone
    return f"{syllable}.mp3"


def is_pinyin(text):
    """
    Check if text looks like pinyin input.
    """
    text = text.lower().replace('v', 'ü')
    # Remove tone numbers
    text = re.sub(r'[1-5]', '', text)
    # Remove tone marks
    for mark in TONE_MARK_TO_NUMBER:
        text = text.replace(mark, 'a')
    # Check if remaining is all ASCII letters
    return bool(re.match(r'^[a-z\s]+$', text)) and len(text) > 0


def is_chinese(text):
    """
    Check if text contains Chinese characters.
    """
    for char in text:
        if '\u4e00' <= char <= '\u9fff':
            return True
        if '\u3400' <= char <= '\u4dbf':  # Extension A
            return True
        if '\u20000' <= char <= '\u2a6df':  # Extension B
            return True
    return False
