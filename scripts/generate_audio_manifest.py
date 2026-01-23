#!/usr/bin/env python3
"""
Generate a manifest of all required audio files for Mandarin pinyin syllables.
This script creates a list of all syllable+tone combinations needed.

In production, you would use this manifest to:
1. Download audio files from a source
2. Generate audio using TTS
3. Or map to an existing audio library

All possible Mandarin syllables are covered (~1300 unique combinations).
"""

import os
import json

# All possible Mandarin initials (including empty initial)
INITIALS = [
    '', 'b', 'p', 'm', 'f',
    'd', 't', 'n', 'l',
    'g', 'k', 'h',
    'j', 'q', 'x',
    'zh', 'ch', 'sh', 'r',
    'z', 'c', 's',
    'y', 'w'
]

# All possible Mandarin finals
FINALS = [
    'a', 'o', 'e', 'i', 'u', 'v',  # v represents ü
    'ai', 'ei', 'ao', 'ou',
    'an', 'en', 'ang', 'eng', 'ong',
    'ia', 'ie', 'iao', 'iu', 'ian', 'in', 'iang', 'ing', 'iong',
    'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang', 'ueng',
    've', 'van', 'vn',  # ü combinations
    'er',  # special final
]

# Valid syllable combinations (not all initial+final combos are valid)
# This is a simplified approach - we generate and filter
VALID_SYLLABLES = set()


def is_valid_syllable(initial, final):
    """
    Check if an initial+final combination is a valid Mandarin syllable.
    This is a simplified check - some edge cases may be missed.
    """
    syllable = initial + final

    # Special cases
    if initial == '' and final in ['i', 'in', 'ing']:
        return False  # These need y- initial
    if initial == '' and final in ['u', 'un']:
        return False  # These need w- initial

    # j, q, x only combine with i, ü finals
    if initial in ['j', 'q', 'x']:
        if not final.startswith(('i', 'v', 'u')):
            return False
        # j, q, x + u is actually ü
        if final.startswith('u') and final not in ['uan', 'un', 'u']:
            return False

    # zh, ch, sh, r, z, c, s don't combine with i-initial finals (except i itself)
    if initial in ['zh', 'ch', 'sh', 'r', 'z', 'c', 's']:
        if final.startswith('i') and final != 'i':
            return False

    # ü finals only with j, q, x, l, n (and empty)
    if final.startswith('v'):
        if initial not in ['', 'j', 'q', 'x', 'l', 'n', 'y']:
            return False

    # Some finals only work with certain initials
    if final == 'ong' and initial == '':
        return False  # needs a consonant

    if final in ['iong'] and initial not in ['', 'j', 'q', 'x']:
        return False

    return True


def generate_syllable_list():
    """Generate list of all valid Mandarin syllables."""
    syllables = set()

    for initial in INITIALS:
        for final in FINALS:
            if is_valid_syllable(initial, final):
                syllable = initial + final
                # Normalize some spellings
                if syllable.startswith('v'):
                    syllable = 'y' + syllable[1:]  # v -> yu
                syllables.add(syllable)

    # Add special syllables
    special = [
        'a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'er',
        'yi', 'ya', 'ye', 'yao', 'you', 'yan', 'yin', 'yang', 'ying', 'yong',
        'wu', 'wa', 'wo', 'wai', 'wei', 'wan', 'wen', 'wang', 'weng',
        'yu', 'yue', 'yuan', 'yun',
        'zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si',
        'ju', 'qu', 'xu', 'jue', 'que', 'xue', 'juan', 'quan', 'xuan',
        'jun', 'qun', 'xun',
        'lv', 'nv', 'lve', 'nve',
    ]
    syllables.update(special)

    return sorted(syllables)


def generate_audio_manifest(output_dir):
    """
    Generate manifest of all required audio files.
    Each syllable has 5 tones (1-4 + neutral/5).
    """
    syllables = generate_syllable_list()
    manifest = []

    for syllable in syllables:
        for tone in range(1, 6):
            filename = f"{syllable}{tone}.mp3"
            manifest.append({
                'syllable': syllable,
                'tone': tone,
                'filename': filename,
            })

    return manifest


def create_placeholder_files(audio_dir, manifest):
    """
    Create placeholder files for all audio entries.
    In production, these would be replaced with actual audio files.
    """
    os.makedirs(audio_dir, exist_ok=True)

    for entry in manifest:
        filepath = os.path.join(audio_dir, entry['filename'])
        # Create empty placeholder file
        with open(filepath, 'w') as f:
            pass

    print(f"Created {len(manifest)} placeholder audio files in {audio_dir}")


if __name__ == '__main__':
    import sys

    # Generate manifest
    manifest = generate_audio_manifest('.')
    print(f"Total audio files needed: {len(manifest)}")

    # Save manifest as JSON
    script_dir = os.path.dirname(os.path.abspath(__file__))
    manifest_path = os.path.join(script_dir, 'audio_manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest saved to: {manifest_path}")

    # Optionally create placeholder files
    if len(sys.argv) > 1 and sys.argv[1] == '--create-placeholders':
        audio_dir = os.path.join(script_dir, '..', 'static', 'audio')
        create_placeholder_files(audio_dir, manifest)
