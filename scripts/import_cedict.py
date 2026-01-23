#!/usr/bin/env python3
"""
Script to download and import CC-CEDICT dictionary data.

Usage:
    python import_cedict.py [path_to_cedict_file]

If no file is provided, the script will attempt to download the latest
CC-CEDICT from the official source.
"""

import os
import sys
import gzip
import urllib.request
import tempfile

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import import_cedict, init_database, get_entry_count

CEDICT_URL = "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz"


def download_cedict(output_path):
    """Download CC-CEDICT from the official source."""
    print(f"Downloading CC-CEDICT from {CEDICT_URL}...")

    # Download the gzipped file
    with tempfile.NamedTemporaryFile(suffix='.gz', delete=False) as tmp_gz:
        urllib.request.urlretrieve(CEDICT_URL, tmp_gz.name)
        tmp_gz_path = tmp_gz.name

    # Decompress
    print("Decompressing...")
    with gzip.open(tmp_gz_path, 'rt', encoding='utf-8') as gz_file:
        with open(output_path, 'w', encoding='utf-8') as out_file:
            out_file.write(gz_file.read())

    # Cleanup
    os.unlink(tmp_gz_path)
    print(f"Downloaded and saved to: {output_path}")

    return output_path


def main():
    # Determine data directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    data_dir = os.path.join(project_dir, 'data')
    os.makedirs(data_dir, exist_ok=True)

    # Check for provided file path
    if len(sys.argv) > 1:
        cedict_path = sys.argv[1]
        if not os.path.exists(cedict_path):
            print(f"Error: File not found: {cedict_path}")
            sys.exit(1)
    else:
        # Download if not exists
        cedict_path = os.path.join(data_dir, 'cedict_ts.u8')
        if not os.path.exists(cedict_path):
            try:
                download_cedict(cedict_path)
            except Exception as e:
                print(f"Error downloading CC-CEDICT: {e}")
                print("\nPlease download manually from:")
                print("  https://www.mdbg.net/chinese/dictionary?page=cc-cedict")
                print(f"\nAnd save to: {cedict_path}")
                sys.exit(1)
        else:
            print(f"Using existing file: {cedict_path}")

    # Initialize database
    print("\nInitializing database...")
    init_database()

    # Import data
    print(f"\nImporting from: {cedict_path}")
    count = import_cedict(cedict_path)

    # Verify
    actual_count = get_entry_count()
    print(f"\nImport complete!")
    print(f"Total entries in database: {actual_count:,}")


if __name__ == '__main__':
    main()
