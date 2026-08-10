#!/usr/bin/env node
/**
 * Converts a camelCase word JSON file (the shape used by apps/backend/core-50.json)
 * into the CSV layout the admin bulk-upload screen expects.
 *
 * Usage:
 *   node scripts/vocab-json-to-csv.js data/minna-no-nihongo/lesson-01.json
 *   node scripts/vocab-json-to-csv.js <input.json> [output.csv]
 *
 * The output is UTF-8 with a BOM so Excel opens the Japanese text correctly;
 * the backend parser strips that BOM before reading (admin.service.ts).
 */
const fs = require('fs');
const path = require('path');

// Column order the uploader's template uses. `topic_name` is left out on
// purpose: a book upload takes its topic from the form field, and a stray
// topic_name column would also file every word under a bookless global topic.
const COLUMNS = [
  ['japanese_word', 'japaneseWord'],
  ['hiragana', 'hiragana'],
  ['meaning', 'meaning'],
  ['part_of_speech', 'partOfSpeech'],
  ['jlpt_level', 'jlptLevel'],
  ['frequency', 'frequency'],
  ['pitch_accent', 'pitchAccent'],
  ['te_form', 'teForm'],
  ['ta_form', 'taForm'],
  ['nai_form', 'naiForm'],
  ['masu_form', 'masuForm'],
  ['example_sentence', 'exampleSentence'],
  ['example_translation', 'exampleTranslation'],
  ['synonyms', 'synonyms'],
  ['antonyms', 'antonyms'],
  ['nuance', 'nuance'],
  ['kanji_info', 'kanjiInfo'],
  ['additional_examples', 'additionalExamples'],
  ['compounds', 'compounds'],
];

/** synonyms/antonyms travel as a comma-joined string; JSON columns as JSON text. */
const serialise = (key, value) => {
  if (value === undefined || value === null) return '';
  if (key === 'synonyms' || key === 'antonyms') {
    return Array.isArray(value) ? value.join(', ') : String(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const quote = (field) => `"${field.replace(/"/g, '""')}"`;

const main = () => {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node scripts/vocab-json-to-csv.js <input.json> [output.csv]');
    process.exit(1);
  }

  const output = process.argv[3] ?? input.replace(/\.json$/i, '.csv');
  const words = JSON.parse(fs.readFileSync(input, 'utf8'));

  if (!Array.isArray(words)) {
    console.error('Input JSON must be an array of word objects.');
    process.exit(1);
  }

  const lines = [COLUMNS.map(([header]) => quote(header)).join(',')];
  for (const word of words) {
    lines.push(
      COLUMNS.map(([, key]) => quote(serialise(key, word[key]))).join(','),
    );
  }

  fs.writeFileSync(output, '﻿' + lines.join('\n') + '\n', 'utf8');
  console.log(`${words.length} ta so'z → ${path.relative(process.cwd(), output)}`);
};

main();
