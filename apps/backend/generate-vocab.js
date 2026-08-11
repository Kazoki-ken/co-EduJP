require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
// Parse start and end topics from command line arguments
const args = process.argv.slice(2);
let startTopic = 1;
let endTopic = 50; // default to max topics
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--start' && args[i + 1]) {
    startTopic = parseInt(args[i + 1], 10);
  }
  if (args[i] === '--end' && args[i + 1]) {
    endTopic = parseInt(args[i + 1], 10);
  }
}

const PROGRESS_FILE = path.join(__dirname, `generate-progress-${startTopic}-${endTopic}.json`);

// ─── 50 Topics Covering 5000 Words (N5 to N1) ──────────────────────────────────
const TOPICS = [
  { id: 1, name: "Kundalik harakat fe'llari (Daily actions)", level: "N5" },
  { id: 2, name: "Oila va inson munosabatlari (Family & Relationships)", level: "N5" },
  { id: 3, name: "Oziq-ovqat va ichimliklar (Food & Drinks)", level: "N5" },
  { id: 4, name: "Mevalar va sabzavotlar (Fruits & Vegetables)", level: "N5" },
  { id: 5, name: "Uy-ro'zg'or buyumlari va xonalar (Home & Rooms)", level: "N5" },
  { id: 6, name: "Tana a'zolari va tashqi ko'rinish (Body & Appearance)", level: "N5" },
  { id: 7, name: "Kiyim-kechak va aksessuarlar (Clothing)", level: "N5" },
  { id: 8, name: "Ob-havo va tabiat hodisalari (Weather & Nature)", level: "N5" },
  { id: 9, name: "Hayvonlar va qushlar (Animals & Birds)", level: "N5" },
  { id: 10, name: "Ranglar, shakllar va o'lchamlar (Colors & Shapes)", level: "N5" },
  { id: 11, name: "Vaqt, kunlar va fasllar (Time & Seasons)", level: "N5" },
  { id: 12, name: "Sonlar va miqdorlar (Numbers & Quantities)", level: "N5" },
  { id: 13, name: "Maktab va sinf jihozlari (School & Classroom)", level: "N5" },
  { id: 14, name: "Transport va harakatlanish (Transport)", level: "N5" },
  { id: 15, name: "Sifatlar: Odam his-tuyg'ulari (Adjectives: Emotions)", level: "N5" },
  { id: 16, name: "Sifatlar: Narsalarning xususiyatlari (Adjectives: Objects)", level: "N5" },
  { id: 17, name: "Sayohat va mehmonxona atamalari (Travel)", level: "N4" },
  { id: 18, name: "Kasblar va ish faoliyati (Professions & Work)", level: "N4" },
  { id: 19, name: "Hordiq chiqarish va sevimli mashg'ulotlar (Hobbies)", level: "N4" },
  { id: 20, name: "Shahardagi joylar va yo'nalishlar (City & Directions)", level: "N4" },
  { id: 21, name: "Xarid qilish va do'konlar (Shopping)", level: "N4" },
  { id: 22, name: "Salomatlik, kasalliklar va shifoxona (Health & Hospital)", level: "N4" },
  { id: 23, name: "Tabiat, daraxtlar va gullar (Plants & Nature)", level: "N4" },
  { id: 24, name: "Sport, o'yinlar va musobaqalar (Sports)", level: "N4" },
  { id: 25, name: "Axborot texnologiyalari va internet (IT & Internet)", level: "N4" },
  { id: 26, name: "Musiqa, teatr va kino (Arts & Entertainment)", level: "N4" },
  { id: 27, name: "Davlatlar, millatlar va tillar (Geography)", level: "N4" },
  { id: 28, name: "Idora va kantselyariya jihozlari (Office life)", level: "N4" },
  { id: 29, name: "Aloqa va ommaviy axborot vositalari (Media)", level: "N3" },
  { id: 30, name: "Moliyaviy operatsiyalar va bank (Money & Banking)", level: "N3" },
  { id: 31, name: "Geografiya va ekologiya (Ecology & Geography)", level: "N3" },
  { id: 32, name: "Inson fe'l-atvori va xarakteri (Personality)", level: "N3" },
  { id: 33, name: "Tadqiqot, tajribalar va ilm-fan (Science)", level: "N3" },
  { id: 34, name: "Mehmonxona va xizmat ko'rsatish sohalari (Services)", level: "N3" },
  { id: 35, name: "Tarix va madaniy meros (History & Culture)", level: "N3" },
  { id: 36, name: "Qurilish, materiallar va asboblar (Construction)", level: "N3" },
  { id: 37, name: "Qishloq xo'jaligi va chorvachilik (Agriculture)", level: "N3" },
  { id: 38, name: "Adabiyot va matbaa atamalari (Literature)", level: "N3" },
  { id: 39, name: "Huquq, qonunlar va jinoyatchilik (Law)", level: "N3" },
  { id: 40, name: "Astronomiya va kosmik tadqiqotlar (Space)", level: "N2" },
  { id: 41, name: "Biznes, savdo va muzokaralar (Business)", level: "N2" },
  { id: 42, name: "Siyosat, xalqaro munosabatlar (Politics)", level: "N2" },
  { id: 43, name: "Falsafa, din va mifologiya (Philosophy & Religion)", level: "N2" },
  { id: 44, name: "Harbiy atamalar va milliy mudofaa (Military)", level: "N2" },
  { id: 45, name: "Tibbiy va farmatsevtik terminlar (Medicine)", level: "N2" },
  { id: 46, name: "San'at va arxitektura terminlari (Art & Architecture)", level: "N2" },
  { id: 47, name: "Jamiyat muammolari va ijtimoiy hayot (Society)", level: "N1" },
  { id: 48, name: "Iqtisodiyot va jahon bozori (Economics)", level: "N1" },
  { id: 49, name: "Abstrakt falsafiy g'oyalar (Abstract Concepts)", level: "N1" },
  { id: 50, name: "Yapon madaniyati, bayramlari va taomlari (Culture)", level: "N1" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveApiKey() {
  let key = process.env.GEMINI_API_KEY?.trim();

  if (!key) {
    try {
      const dbConfig = await prisma.siteConfiguration.findUnique({
        where: { key: 'gemini_api_key' },
      });
      key = dbConfig?.value?.trim();
    } catch {
      // DB unreachable — fall through to the error below.
    }
  }

  if (!key) {
    throw new Error(
      'Gemini API key not configured. Set GEMINI_API_KEY in apps/backend/.env ' +
        'or add a "gemini_api_key" row to site_configurations.',
    );
  }

  return key;
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch {
      return { lastTopicId: 0, batch: 1 };
    }
  }
  return { lastTopicId: 0, batch: 1 };
}

function saveProgress(lastTopicId, batch) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastTopicId, batch }, null, 2), 'utf8');
}

async function main() {
  const apiKey = await resolveApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  // Cheapest model that produces good vocabulary JSON. This script generates
  // thousands of words in a run, so the model choice dominates its cost.
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite',
  });

  const progress = loadProgress();
  const actualStartTopic = Math.max(startTopic, progress.lastTopicId);
  console.log(`Starting/resuming vocabulary generation for topics ${startTopic} to ${endTopic}. Current progress: Topic ID ${actualStartTopic}, Batch ${progress.batch}`);

  const filteredTopics = TOPICS.filter(t => t.id >= startTopic && t.id <= endTopic);

  for (const topic of filteredTopics) {
    if (topic.id < actualStartTopic) {
      continue; // Skip already completed topics
    }

    console.log(`\n========================================`);
    console.log(`Processing Topic ${topic.id}/${endTopic}: "${topic.name}" (${topic.level})`);
    console.log(`========================================`);

    // We do 4 batches of 50 words per topic to generate 200 words total (10,000 words total across 50 topics)
    for (let batchNum = 1; batchNum <= 4; batchNum++) {
      if (topic.id === progress.lastTopicId && batchNum < progress.batch) {
        continue; // Skip already completed batch of this topic
      }

      console.log(`Generating Batch ${batchNum}/4 (50 words) for topic "${topic.name}"...`);

      // Retrieve existing words for this topic to prevent duplicates
      let existingWordsList = [];
      const dbTopicForCheck = await prisma.topic.findFirst({
        where: { name: topic.name, bookId: null },
        include: { wordTopics: { include: { word: true } } }
      });
      if (dbTopicForCheck) {
        existingWordsList = dbTopicForCheck.wordTopics.map(wt => wt.word.japaneseWord);
      }

      let excludeInstructions = '';
      if (existingWordsList.length > 0) {
        excludeInstructions = `\nCRITICAL: Do NOT generate any of the following Japanese words as they are already generated: ${JSON.stringify(existingWordsList)}.`;
      }

      const prompt = `Generate a JSON array of exactly 50 distinct Japanese vocabulary words suitable for the topic: "${topic.name}" at JLPT Level "${topic.level}".
Ensure the words are relevant and cover nouns, verbs, or adjectives as appropriate.
Do not wrap the response in markdown blocks or write any text other than the JSON itself. It must start with '[' and end with ']'.${excludeInstructions}

Each word object in the JSON array must strictly have the following fields:
1. "japaneseWord": (string, e.g. "食べる" or "空港")
2. "hiragana": (string, e.g. "たべる" or "くうこう")
3. "meaning": (string, meaning in Uzbek language, e.g. "yemoq" or "aeroport")
4. "partOfSpeech": (string, e.g. "ot", "fe'l", "sifat", "ravish")
5. "jlptLevel": (string, e.g. "N5", "N4", "N3", "N2", "N1")
6. "frequency": (string, e.g. "Top 500", "Top 1000", "Top 2000", "Top 5000")
7. "pitchAccent": (string, e.g. "①", "⓪", "②")
8. "teForm": (string or null, verb/adjective conjugation, e.g. "食べて")
9. "taForm": (string or null, verb/adjective conjugation, e.g. "食べた")
10. "naiForm": (string or null, verb/adjective conjugation, e.g. "食べない")
11. "masuForm": (string or null, verb/adjective conjugation, e.g. "食べます")
12. "exampleSentence": (string, example sentence in Japanese immediately followed by its hiragana reading in parentheses, e.g. "私は毎朝りんごを食べます。 (わたしはまいあさりんごをたべます。)")
13. "exampleTranslation": (string, translation in Uzbek, e.g. "Men har tong olma yeyman.")
14. "additionalExamples": (array of objects, containing 2 more example sentences, keys: "sentence" (string, Japanese sentence followed by its hiragana reading in parentheses, e.g. "友達と一緒にデパートへ行きました。 (ともだちといっしょにでぱーとへいきました。)"), "translation" in Uzbek)
15. "synonyms": (array of strings, synonyms in Japanese kanji/hiragana)
16. "antonyms": (array of strings, antonyms in Japanese kanji/hiragana)
17. "nuance": (string or null, explanation in Uzbek about when/how to use this word vs others)
18. "compounds": (array of objects, 2-3 compound words containing this word, keys: "word", "hiragana", "meaning" in Uzbek)
19. "kanjiInfo": (array of objects, kanji character analysis for each kanji in the word, keys: "kanji", "meaning" in Uzbek, "kunReading", "onReading", "strokes" as integer)
20. "homonyms": (array of objects, list of homonyms - words that have the exact same hiragana/katakana pronunciation but different meanings and kanji (e.g. for "維持" (いじ) homonyms include "意地" (いじ) meaning "o'jarlik, qaysarlik" in Uzbek), keys: "word", "hiragana", "meaning" in Uzbek. If there are no homonyms, return an empty array [])`;

      let responseText = '';
      let parsedWords = [];
      let success = false;
      let retries = 3;

      while (retries > 0 && !success) {
        try {
          const result = await model.generateContent(prompt);
          responseText = result.response.text().trim();
          
          // Clean up potential markdown wrapper (e.g. ```json ... ```)
          if (responseText.startsWith('```')) {
            responseText = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
          }

          parsedWords = JSON.parse(responseText);
          if (Array.isArray(parsedWords) && parsedWords.length > 0) {
            success = true;
          } else {
            console.warn("Invalid format returned. Retrying...");
            retries--;
            await sleep(5000);
          }
        } catch (err) {
          console.error(`Error generating or parsing response (Retries left: ${retries - 1}):`, err);
          retries--;
          await sleep(5000);
        }
      }

      if (!success) {
        console.error(`Failed to generate batch ${batchNum} for topic "${topic.name}" after 3 retries. Skipping to avoid infinite loops.`);
        continue;
      }

      console.log(`Successfully generated ${parsedWords.length} words. Inserting into database...`);

      // ── Find or Create Global Topic ──
      let dbTopic = await prisma.topic.findFirst({
        where: { name: topic.name, bookId: null }
      });
      if (!dbTopic) {
        dbTopic = await prisma.topic.create({
          data: { name: topic.name, bookId: null }
        });
      }

      let insertedCount = 0;
      for (const w of parsedWords) {
        try {
          if (!w.japaneseWord || !w.meaning) continue;

          // Check if word exists in DB
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
          }

          // Check if WordTopic association exists
          const assoc = await prisma.wordTopic.findUnique({
            where: {
              wordId_topicId: {
                wordId: dbWord.id,
                topicId: dbTopic.id
              }
            }
          });

          if (!assoc) {
            await prisma.wordTopic.create({
              data: {
                wordId: dbWord.id,
                topicId: dbTopic.id
              }
            });
          }

          insertedCount++;
        } catch (dbErr) {
          console.error(`Failed to insert word "${w.japaneseWord}":`, dbErr);
        }
      }

      console.log(`Inserted/linked ${insertedCount} words.`);

      // Update progress
      let nextTopicId = topic.id;
      let nextBatch = batchNum + 1;
      if (batchNum === 4) {
        nextTopicId = topic.id + 1;
        nextBatch = 1;
      }
      saveProgress(nextTopicId, nextBatch);

      // Sleep to prevent rate limit limits
      console.log(`Sleeping 8 seconds to prevent rate limits...`);
      await sleep(8000);
    }
  }

  console.log(`\n🎉 ALL TOPICS GENERATED AND INSTALLED SUCCESSFULLY!`);
  // Cleanup progress file
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

main().catch(err => {
  console.error("Fatal error running generation:", err);
  process.exit(1);
});
