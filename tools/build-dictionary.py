#!/usr/bin/env python3
"""Build the offline word dictionary from the pinned OpenRussian TSV export."""

import argparse
import csv
import hashlib
import io
import json
import re
from pathlib import Path

COMMIT = "50e210c4803237779cb562bc1abcea529066031c"
SOURCE = f"https://github.com/Badestrand/russian-dictionary/tree/{COMMIT}"
BLOBS = {
    "nouns.csv": "202e6e19918681f1de061aa8b1839885721e60e9",
    "verbs.csv": "efc1aebf79e36dc97d86c9bbce93810b7b1a997a",
    "adjectives.csv": "09986b701d1b232abb50db96c30b81ceab1c6526",
    "others.csv": "2f819ba39652fceab3afe39ff9ef2a69b0dbd49d",
    "LICENSE": "3b7b82d0da2db857eda1a798dbd908ea136f07b5",
    "README.md": "713967220093e5fb1d9d68264eaaeb33854d19da",
}


def primary_translation(value):
    depth = 0
    for index, char in enumerate(value):
        if char in "([":
            depth += 1
        elif char in ")]":
            depth = max(0, depth - 1)
        elif char in ",;" and depth == 0:
            value = value[:index]
            break
    # Remove innermost balanced usage notes, then their containing notes.
    while True:
        cleaned = re.sub(r"\([^()]*\)|\[[^\[\]]*\]", " ", value)
        if cleaned == value:
            return " ".join(value.split())
        value = cleaned


def source_text(directory, name):
    data = (directory / name).read_bytes()
    blob = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
    if blob != BLOBS[name]:
        raise ValueError(f"{name} does not match pinned commit {COMMIT}")
    return data.decode("utf-8")


def build(directory, destination):
    dictionary = {}
    counts = {}
    duplicates = conflicts = untranslated = 0
    for name in list(BLOBS)[:4]:
        # Quotes in these TSV files are literal text, not CSV quoting markers.
        reader = csv.DictReader(io.StringIO(source_text(directory, name)),
                                delimiter="\t", quoting=csv.QUOTE_NONE)
        if not {"bare", "accented", "translations_en", "translations_de"}.issubset(reader.fieldnames or []):
            raise ValueError(f"Unexpected columns in {name}")
        counts[name] = 0
        for row in reader:
            counts[name] += 1
            if row.get("bare") is None or row.get("translations_en") is None:
                raise ValueError(f"Invalid TSV row {reader.line_num} in {name}")
            key = row["bare"].strip().lower()
            value = primary_translation(row["translations_en"])
            if not key or not value:
                untranslated += 1
                continue
            if key in dictionary:
                duplicates += 1
                conflicts += dictionary[key] != value
            else:
                dictionary[key] = value

    readme = source_text(directory, "README.md")
    license_text = source_text(directory, "LICENSE")
    attribution = f"""OpenRussian offline dictionary

Source: OpenRussian.org and its contributors
Database information: https://en.openrussian.org/dictionary-data
Pinned source: {SOURCE}
License: Creative Commons Attribution-ShareAlike 4.0 International
https://creativecommons.org/licenses/by-sa/4.0/

This derived dictionary.json is distributed under the same CC BY-SA 4.0 license.
Changes: use all four TSV exports (nouns, verbs, adjectives, others); lowercase
the bare Russian headword; select the first English synonym/sense separated by
a comma or semicolon outside parentheses/brackets; remove balanced parenthetical
and bracketed usage notes and normalize whitespace; preserve English case.
Duplicate headwords retain the first entry in the file order above.
Rows without a headword or English translation are omitted. No words were
handpicked, and no translation API was queried. Coverage is limited to headwords
in this snapshot; it is not an exhaustive translator of inflected Russian text.

Reproduce with Python 3 after downloading all six files from the pinned source:
python3 tools/build-dictionary.py /path/to/source
The builder verifies every file against its original Git blob ID.

Counts: {json.dumps(counts, ensure_ascii=False)}
Unique keys: {len(dictionary)}; duplicate rows: {duplicates}; conflicting duplicate
translations: {conflicts}; rows without usable English/headword: {untranslated}.

----- Original source README (verbatim) -----
{readme}

----- Original source LICENSE (verbatim) -----
{license_text}
"""
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "dictionary.json").write_text(
        json.dumps(dictionary, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    (destination / "DICTIONARY-LICENSE.txt").write_text(attribution, encoding="utf-8")
    print(json.dumps({"rows": counts, "keys": len(dictionary), "duplicates": duplicates,
                      "conflicts": conflicts, "untranslated": untranslated}, ensure_ascii=False))


def self_test():
    assert primary_translation("person, people; man") == "person"
    assert primary_translation("on (day, week); onto") == "on"
    assert primary_translation("hello (informal)") == "hello"
    assert primary_translation("a (note [nested (deep)]) word; another") == "a word"
    assert primary_translation("[usage note]") == ""
    assert primary_translation("I; me") == "I"
    assert primary_translation("New York") == "New York"
    assert primary_translation("  ") == ""
    row = next(csv.DictReader(io.StringIO('bare\ttranslations_en\nслово\t"word", term\n'),
                              delimiter="\t", quoting=csv.QUOTE_NONE))
    assert row == {"bare": "слово", "translations_en": '"word", term'}
    print("9 self-checks passed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_dir", type=Path, nargs="?")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "docs")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
    if args.source_dir:
        build(args.source_dir, args.output)
    elif not args.self_test:
        parser.error("source_dir is required unless --self-test is used")
