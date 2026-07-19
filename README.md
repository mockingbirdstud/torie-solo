# Torie Solo

A single-player word strategy game built around filling a 10×10 board with connected, dictionary-valid words.

## Play

The published GitHub Pages preview is deployed automatically from the `main` branch.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run build
```

## Dictionary

Word validation uses the American-English size-60 list from the English
Speller Database (formerly SCOWL), generated at variant level 1 without
abbreviations or special-category entries. Torie keeps alphabetic words from
2–10 letters, the complete playable range of its 10×10 board.

The source license is included at `src/data/ESDB-LICENSE.txt`.
