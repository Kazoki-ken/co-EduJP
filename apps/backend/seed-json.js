require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const jsonPath = path.join(__dirname, 'core-50.json');

async function main() {
  try {
    console.log('Reading core-50.json...');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const words = JSON.parse(rawData);

    console.log(`Loaded ${words.length} words from JSON. Seeding database...`);

    let wordCount = 0;
    let topicCount = 0;
    let linkCount = 0;

    for (const w of words) {
      if (!w.japaneseWord || !w.meaning || !w.topicName) {
        console.warn('Skipping word due to missing required fields:', w);
        continue;
      }

      // 1. Create or get the Global Topic (bookId: null)
      let topic = await prisma.topic.findFirst({
        where: { name: w.topicName, bookId: null }
      });
      if (!topic) {
        topic = await prisma.topic.create({
          data: { name: w.topicName, bookId: null }
        });
        topicCount++;
        console.log(`Created Topic: ${w.topicName}`);
      }

      // 2. Create or get the Word
      let dbWord = await prisma.word.findFirst({
        where: {
          japaneseWord: w.japaneseWord,
          meaning: w.meaning
        }
      });

      if (!dbWord) {
        dbWord = await prisma.word.create({
          data: {
            japaneseWord: w.japaneseWord,
            hiragana: w.hiragana,
            meaning: w.meaning,
            exampleSentence: w.exampleSentence,
            exampleTranslation: w.exampleTranslation,
            partOfSpeech: w.partOfSpeech,
            jlptLevel: w.jlptLevel,
            frequency: w.frequency,
            pitchAccent: w.pitchAccent,
            teForm: w.teForm,
            taForm: w.taForm,
            naiForm: w.naiForm,
            masuForm: w.masuForm,
            kanjiInfo: w.kanjiInfo || [],
            additionalExamples: w.additionalExamples || [],
            synonyms: w.synonyms || [],
            antonyms: w.antonyms || [],
            nuance: w.nuance,
            compounds: w.compounds || [],
            homonyms: w.homonyms || []
          }
        });
        wordCount++;
        console.log(`Created Word: ${w.japaneseWord}`);
      }

      // 3. Link Word to Topic
      const assoc = await prisma.wordTopic.findUnique({
        where: {
          wordId_topicId: {
            wordId: dbWord.id,
            topicId: topic.id
          }
        }
      });

      if (!assoc) {
        await prisma.wordTopic.create({
          data: {
            wordId: dbWord.id,
            topicId: topic.id
          }
        });
        linkCount++;
      }
    }

    console.log('\n🌱 SEED COMPLETED!');
    console.log(`New Topics created: ${topicCount}`);
    console.log(`New Words created: ${wordCount}`);
    console.log(`Word-Topic associations linked: ${linkCount}`);

  } catch (err) {
    console.error('Fatal error during seed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
