require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Seeds one lesson of an official book from a camelCase word JSON file.
 *
 * Usage:
 *   node seed-book-lesson.js --book "Minna no Nihongo I" --topic "1-dars" \
 *        --file ../../data/minna-no-nihongo/lesson-01.json [--description "..."]
 *
 * Mirrors what admin.service.bulkUploadBookWords does — book and topic are
 * found-or-created, existing words are linked to the topic instead of being
 * duplicated — so running it twice is safe. Official content means authorId
 * stays null and isUserCreated stays false; that is what the main dictionary
 * lists (see OFFICIAL_ONLY in vocabulary.service.ts).
 */
const parseArgs = () => {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (key) args[key] = argv[i + 1];
  }
  return args;
};

async function main() {
  const { book: bookTitle, topic: topicName, file, description } = parseArgs();

  if (!bookTitle || !topicName || !file) {
    console.error('Usage: node seed-book-lesson.js --book "<title>" --topic "<name>" --file <words.json>');
    process.exit(1);
  }

  const jsonPath = path.resolve(process.cwd(), file);
  const words = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!Array.isArray(words)) throw new Error('Word file must contain an array.');

  // ── Book (official: authorId null) ────────────────────────────────────────
  let book = await prisma.book.findFirst({ where: { title: bookTitle, authorId: null } });
  if (!book) {
    book = await prisma.book.create({
      data: { title: bookTitle, description: description ?? null },
    });
    console.log(`Kitob yaratildi: ${book.title} (${book.id})`);
  } else {
    console.log(`Kitob topildi: ${book.title} (${book.id})`);
  }

  // ── Topic under that book ─────────────────────────────────────────────────
  let topic = await prisma.topic.findFirst({ where: { name: topicName, bookId: book.id } });
  if (!topic) {
    topic = await prisma.topic.create({ data: { name: topicName, bookId: book.id } });
    console.log(`Mavzu yaratildi: ${topic.name} (${topic.id})`);
  } else {
    console.log(`Mavzu topildi: ${topic.name} (${topic.id})`);
  }

  // ── Words ─────────────────────────────────────────────────────────────────
  let created = 0;
  let linked = 0;
  let reordered = 0;

  // Position inside the topic follows the file: that is the lesson's own order.
  // Re-running the script re-applies it, so fixing the source file and seeding
  // again is enough to correct a wrong order.
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const sortOrder = i + 1;
    const data = {
      japaneseWord: w.japaneseWord,
      hiragana: w.hiragana ?? '',
      meaning: w.meaning,
      exampleSentence: w.exampleSentence ?? null,
      exampleTranslation: w.exampleTranslation ?? null,
      partOfSpeech: w.partOfSpeech ?? null,
      jlptLevel: w.jlptLevel ?? null,
      frequency: w.frequency ?? null,
      pitchAccent: w.pitchAccent || null,
      teForm: w.teForm ?? null,
      taForm: w.taForm ?? null,
      naiForm: w.naiForm ?? null,
      masuForm: w.masuForm ?? null,
      kanjiInfo: w.kanjiInfo ?? undefined,
      additionalExamples: w.additionalExamples ?? undefined,
      compounds: w.compounds ?? undefined,
      homonyms: w.homonyms ?? undefined,
      synonyms: w.synonyms ?? [],
      antonyms: w.antonyms ?? [],
      nuance: w.nuance ?? null,
    };

    const existing = await prisma.word.findFirst({
      where: { japaneseWord: w.japaneseWord, isUserCreated: false },
    });

    if (existing) {
      const link = await prisma.wordTopic.findUnique({
        where: { wordId_topicId: { wordId: existing.id, topicId: topic.id } },
      });
      if (link) {
        if (link.sortOrder !== sortOrder) {
          await prisma.wordTopic.update({
            where: { wordId_topicId: { wordId: existing.id, topicId: topic.id } },
            data: { sortOrder },
          });
          reordered++;
        }
      } else {
        await prisma.wordTopic.create({
          data: { wordId: existing.id, topicId: topic.id, sortOrder },
        });
        linked++;
      }
      continue;
    }

    await prisma.word.create({
      data: { ...data, wordTopics: { create: [{ topicId: topic.id, sortOrder }] } },
    });
    created++;
  }

  console.log(`Yangi so'z: ${created} | mavzuga bog'landi: ${linked} | tartibi to'g'rilandi: ${reordered}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
