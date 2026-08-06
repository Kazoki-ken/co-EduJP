require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const wordsToSeed = [
  {
    japaneseWord: "行く",
    hiragana: "いく",
    meaning: "bormoq",
    partOfSpeech: "fe'l",
    jlptLevel: "N5",
    frequency: "Top 100",
    pitchAccent: "⓪",
    teForm: "行って",
    taForm: "行った",
    naiForm: "行かない",
    masuForm: "行きます",
    exampleSentence: "明日、学校に行きます。",
    exampleTranslation: "Ertaga maktabga boraman.",
    additionalExamples: [
      { sentence: "友達と一緒にデパートへ行きました。", translation: "Do'stim bilan birga univermagga bordim." },
      { sentence: "どこに行きたいですか。", translation: "Qayerga borishni xohlaysiz?" }
    ],
    synonyms: ["赴く"],
    antonyms: ["来る", "帰る"],
    nuance: "Harakat so'zlovchidan boshqa bir yo'nalishga qaratilganini ifodalaydi.",
    compounds: [
      { word: "旅行する", hiragana: "ryokou suru", meaning: "sayohat qilmoq" },
      { word: "直行する", hiragana: "chokkou suru", meaning: "to'g'ridan-to'g'ri bormoq" }
    ],
    kanjiInfo: [
      { kanji: "行", meaning: "yurmoq, bormoq", kunReading: "i, yu, okonau", onReading: "kou, gyou", strokes: 6 }
    ]
  },
  {
    japaneseWord: "来る",
    hiragana: "くる",
    meaning: "kelmoq",
    partOfSpeech: "fe'l",
    jlptLevel: "N5",
    frequency: "Top 100",
    pitchAccent: "①",
    teForm: "来 de 来て",
    taForm: "来 de 来た",
    naiForm: "来ない",
    masuForm: "来ます",
    exampleSentence: "あそこに黒い猫が来ました。",
    exampleTranslation: "U yerga qora mushuk keldi.",
    additionalExamples: [
      { sentence: "私の家に来ませんか。", translation: "Biznikiga kelmaysizmi?" },
      { sentence: "早く来てください。", translation: "Iltimos, tezroq keling." }
    ],
    synonyms: ["参る"],
    antonyms: ["行く", "去る"],
    nuance: "Harakat so'zlovchining turgan joyiga yoki yo'nalishiga qarab kelayotganini bildiradi.",
    compounds: [
      { word: "外来", hiragana: "gairai", meaning: "tashqaridan kelgan, ambulator" },
      { word: "本来", hiragana: "honrai", meaning: "aslida, tabiatan" }
    ],
    kanjiInfo: [
      { kanji: "来", meaning: "kelmoq, kelgusi", kunReading: "ku, ki, ko", onReading: "rai", strokes: 7 }
    ]
  },
  {
    japaneseWord: "食べる",
    hiragana: "たべる",
    meaning: "yemoq",
    partOfSpeech: "fe'l",
    jlptLevel: "N5",
    frequency: "Top 150",
    pitchAccent: "②",
    teForm: "食べて",
    taForm: "食べた",
    naiForm: "食べない",
    masuForm: "食べます",
    exampleSentence: "朝ご飯にパンを食べました。",
    exampleTranslation: "Nonushtaga non yedim.",
    additionalExamples: [
      { sentence: "日本料理を食べたことがありますか。", translation: "Yapon taomlarini yeb ko'rganmisiz?" },
      { sentence: "リンゴを一つ食べたいです。", translation: "Bitta olma yeyishni xohlayman." }
    ],
    synonyms: ["食す", "召し上がる"],
    antonyms: ["絶食する"],
    nuance: "Ovqat iste'mol qilishning eng umumiy va neytral shaklidir.",
    compounds: [
      { word: "食べ物", hiragana: "tabemono", meaning: "oziq-ovqat, yegulik" },
      { word: "朝食", hiragana: "choushoku", meaning: "nonushta" }
    ],
    kanjiInfo: [
      { kanji: "食", meaning: "yemoq, taom", kunReading: "ta, ku", onReading: "shoku", strokes: 9 }
    ]
  },
  {
    japaneseWord: "飲む",
    hiragana: "のむ",
    meaning: "ichmoq",
    partOfSpeech: "fe'l",
    jlptLevel: "N5",
    frequency: "Top 200",
    pitchAccent: "①",
    teForm: "飲んで",
    taForm: "飲んだ",
    naiForm: "飲まない",
    masuForm: "飲みます",
    exampleSentence: "お茶を飲みましょう。",
    exampleTranslation: "Keling, choy ichamiz.",
    additionalExamples: [
      { sentence: "薬はもう飲みましたか。", translation: "Dorini ichib bo'ldingizmi?" },
      { sentence: "毎晩牛乳を飲みます。", translation: "Har kuni kechqurun sut ichaman." }
    ],
    synonyms: ["喫する", "召し上がる"],
    antonyms: [],
    nuance: "Suyuqlik ichish, shuningdek dori qabul qilish va tamaki chekish uchun ham ba'zan ishlatiladi.",
    compounds: [
      { word: "飲み物", hiragana: "nomimono", meaning: "ichimlik" },
      { word: "飲食店", hiragana: "inshokuten", meaning: "restoran/barlar" }
    ],
    kanjiInfo: [
      { kanji: "飲", meaning: "ichmoq", kunReading: "no", onReading: "in", strokes: 12 }
    ]
  },
  {
    japaneseWord: "見る",
    hiragana: "みる",
    meaning: "ko'rmoq, qaramoq",
    partOfSpeech: "fe'l",
    jlptLevel: "N5",
    frequency: "Top 100",
    pitchAccent: "①",
    teForm: "見て",
    taForm: "見た",
    naiForm: "見ない",
    masuForm: "見ます",
    exampleSentence: "映画を見るのが好きです。",
    exampleTranslation: "Kino ko'rishni yaxshi ko'raman.",
    additionalExamples: [
      { sentence: "テレビを見ないでください。", translation: "Televizor ko'rmang, iltimos." },
      { sentence: "この写真を見てください。", translation: "Bu rasmga qarang." }
    ],
    synonyms: ["眺める", "観る"],
    antonyms: [],
    nuance: "Ko'z bilan ko'rish yoki diqqat bilan qarash (kino, rasm va h.k.).",
    compounds: [
      { word: "見学", hiragana: "kengaku", meaning: "tashrif buyurib o'rganish" },
      { word: "意見", hiragana: "iken", meaning: "fikr, mulohaza" }
    ],
    kanjiInfo: [
      { kanji: "見", meaning: "ko'rmoq, qaramoq", kunReading: "mi", onReading: "ken", strokes: 7 }
    ]
  },
  {
    japaneseWord: "聞く",
    hiragana: "きく",
    meaning: "eshitmoq, tinglamoq, so'ramoq",
    partOfSpeech: "fe'l",
    jlptLevel: "N5",
    frequency: "Top 150",
    pitchAccent: "⓪",
    teForm: "聞いて",
    taForm: "聞いた",
    naiForm: "聞かない",
    masuForm: "聞きます",
    exampleSentence: "日本の音楽を聞きます。",
    exampleTranslation: "Yapon musiqasini tinglayman.",
    additionalExamples: [
      { sentence: "先生に質問を聞きました。", translation: "O'qituvchidan savol so'radim." },
      { sentence: "私の話をよく聞いてください。", translation: "Gapimni yaxshilab eshiting." }
    ],
    synonyms: ["聴く", "尋ねる"],
    antonyms: [],
    nuance: "Tovushlarni eshitish, diqqat bilan tinglash yoki biror narsani so'rab bilish ma'nolarida keladi.",
    compounds: [
      { word: "新聞", hiragana: "shinbun", meaning: "gazeta" },
      { word: "聞き取り", hiragana: "kikitori", meaning: "tinglab tushunish" }
    ],
    kanjiInfo: [
      { kanji: "聞", meaning: "eshitmoq, so'ramoq", kunReading: "ki", onReading: "bun, mon", strokes: 14 }
    ]
  },
  {
    japaneseWord: "書く",
    hiragana: "かく",
    meaning: "yozmoq",
    partOfSpeech: "fe'l",
    jlptLevel: "N5",
    frequency: "Top 200",
    pitchAccent: "①",
    teForm: "書いて",
    taForm: "書いた",
    naiForm: "書かない",
    masuForm: "書きます",
    exampleSentence: "ひらがなで名前を書きます。",
    exampleTranslation: "Ismimni hiraganada yozaman.",
    additionalExamples: [
      { sentence: "手紙を書いて送りました。", translation: "Xat yozib jo'natdim." },
      { sentence: "ここに電話番号を書いてください。", translation: "Bu yerga telefon raqamingizni yozing." }
    ],
    synonyms: ["記す", "執筆する"],
    antonyms: [],
    nuance: "Qog'ozga yoki biror sirtga harf va belgilarni yozish.",
    compounds: [
      { word: "教科書", hiragana: "kyoukasho", meaning: "darslik" },
      { word: "図書館", hiragana: "toshokan", meaning: "kutubxona" }
    ],
    kanjiInfo: [
      { kanji: "書", meaning: "yozmoq, kitob", kunReading: "ka", onReading: "sho", strokes: 10 }
    ]
  },
  {
    japaneseWord: "読む",
    hiragana: "よむ",
    meaning: "o'qimoq",
    partOfSpeech: "fe'l",
    jlptLevel: "N5",
    frequency: "Top 200",
    pitchAccent: "①",
    teForm: "読んで",
    taForm: "読んだ",
    naiForm: "読まない",
    masuForm: "読みます",
    exampleSentence: "毎日本を読みます。",
    exampleTranslation: "Har kuni kitob o'qiyman.",
    additionalExamples: [
      { sentence: "この漢字は何と読みますか。", translation: "Bu kanji qanday o'qiladi?" },
      { sentence: "小説を読むのが趣味です。", translation: "Roman o'qish qiziqishimdir." }
    ],
    synonyms: ["読書する"],
    antonyms: [],
    nuance: "Matn, kitob yoki belgilarni ko'z bilan kuzatib tushunish yoki ovoz chiqarib o'qish.",
    compounds: [
      { word: "読書", hiragana: "dokusho", meaning: "kitobxonlik" },
      { word: "読み方", hiragana: "yomikata", meaning: "o'qilish usuli" }
    ],
    kanjiInfo: [
      { kanji: "読", meaning: "o'qimoq", kunReading: "yo", onReading: "doku", strokes: 14 }
    ]
  },
  {
    japaneseWord: "話す",
    hiragana: "はなす",
    meaning: "gapirmoq, so'zlamoq",
    partOfSpeech: "fe'l",
    jlptLevel: "N5",
    frequency: "Top 150",
    pitchAccent: "②",
    teForm: "話して",
    taForm: "話した",
    naiForm: "話さない",
    masuForm: "話します",
    exampleSentence: "日本語で話してください。",
    exampleTranslation: "Yapon tilida gapiring, iltimos.",
    additionalExamples: [
      { sentence: "友達と英語で話しました。", translation: "Do'stim bilan ingliz tilida gaplashdim." },
      { sentence: "家族について話します。", translation: "Oilam haqida so'zlab beraman." }
    ],
    synonyms: ["喋る", "語る"],
    antonyms: ["黙る"],
    nuance: "Boshqa odam bilan muloqot qilish yoki ma'lumotni og'zaki yetkazish.",
    compounds: [
      { word: "会話", hiragana: "kaiwa", meaning: "suhbat, dialog" },
      { word: "電話", hiragana: "denwa", meaning: "telefon" }
    ],
    kanjiInfo: [
      { kanji: "話", meaning: "so'z, gap", kunReading: "hana, hanashi", onReading: "wa", strokes: 13 }
    ]
  },
  {
    japaneseWord: "会う",
    hiragana: "あう",
    meaning: "uchrashmoq, ko'rishmoq",
    partOfSpeech: "fe'l",
    jlptLevel: "N5",
    frequency: "Top 200",
    pitchAccent: "①",
    teForm: "会って",
    taForm: "会った",
    naiForm: "会わない",
    masuForm: "会います",
    exampleSentence: "駅で友達に会います。",
    exampleTranslation: "Vokzalda do'stim bilan ko'rishaman.",
    additionalExamples: [
      { sentence: "昨日、先生に会いました。", translation: "Kecha o'qituvchim bilan uchrashdim." },
      { sentence: "また来週会いましょう。", translation: "Kelasi hafta yana ko'rishguncha." }
    ],
    synonyms: ["出逢う"],
    antonyms: ["別れる"],
    nuance: "Kimdir bilan rejalashtirilgan holda yoki tasodifan yuzma-yuz uchrashish.",
    compounds: [
      { word: "会社", hiragana: "kaisha", meaning: "kompaniya, firma" },
      { word: "会議", hiragana: "kaigi", meaning: "majlis, yig'ilish" }
    ],
    kanjiInfo: [
      { kanji: "会", meaning: "uchrashuv, jamiyat", kunReading: "a", onReading: "kai", strokes: 6 }
    ]
  }
];

async function seed() {
  try {
    console.log('Seeding first batch of words (Topic 1: Kundalik harakatlar)...');
    
    // 1. Create global topic
    const topicName = "Kundalik harakat fe'llari (Daily actions)";
    let topic = await prisma.topic.findFirst({
      where: { name: topicName, bookId: null }
    });
    if (!topic) {
      topic = await prisma.topic.create({
        data: { name: topicName, bookId: null }
      });
      console.log(`Created Topic: ${topicName}`);
    } else {
      console.log(`Topic already exists: ${topicName}`);
    }

    // 2. Create words and link them
    for (const w of wordsToSeed) {
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
            kanjiInfo: w.kanjiInfo,
            additionalExamples: w.additionalExamples,
            synonyms: w.synonyms,
            antonyms: w.antonyms,
            nuance: w.nuance,
            compounds: w.compounds,
            homonyms: w.homonyms || []
          }
        });
        console.log(`Created Word: ${w.japaneseWord}`);
      } else {
        console.log(`Word already exists: ${w.japaneseWord}`);
      }

      // Link Word to Topic
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
        console.log(`Linked Word "${w.japaneseWord}" to Topic "${topicName}"`);
      }
    }

    console.log('🌱 Topic 1 seeded successfully!');
  } catch (err) {
    console.error('Failed to seed Topic 1:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
