import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';

// ─── Model Selection ─────────────────────────────────────────────────────────

/**
 * The cheapest Gemini model that still handles Japanese well.
 *
 * Price per 1M tokens (Gemini API, August 2026):
 *   gemini-2.5-flash-lite   $0.10 in / $0.40 out   ← what we use
 *   gemini-3.1-flash-lite   $0.25 in / $1.50 out
 *   gemini-3.5-flash-lite   $0.30 in / $2.50 out
 *
 * Output tokens dominate a chat bill, so 2.5-flash-lite is ~3.75× cheaper per
 * reply than 3.1-flash-lite for this workload — explaining a word and quizzing
 * a learner needs no frontier reasoning. Override with the `gemini_model`
 * site-configuration row (admin panel) or the GEMINI_MODEL env var if a newer
 * model ever becomes cheaper.
 */
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

/** Caps a runaway reply. ~500 tokens is a comfortable ceiling for 150 words. */
const MAX_OUTPUT_TOKENS = 512;

// ─── Vocabulary-Locked System Prompt ─────────────────────────────────────────

const SYSTEM_PROMPT = `Sen — VocabJP ilovasining yapon tili so'z boyligi bo'yicha ustozisan.

## TIL QOIDASI (eng muhim)
- Foydalanuvchi bilan HAR DOIM o'zbek tilida gaplash. Ingliz tilida javob berma.
- Yapon so'zlarini asl holida (kanji + hiragana o'qilishi) ko'rsat, izohini o'zbekcha yoz.
- Foydalanuvchi rus yoki ingliz tilida yozsa ham, javobing o'zbekcha bo'lsin.

## NIMA QILA OLASAN
1. So'zning ma'nosi, o'qilishi (hiragana/katakana), so'z turkumi va nozik ma'nosini tushuntirish
2. So'zga 1–2 ta tabiiy misol gap + o'zbekcha tarjimasi
3. Test o'tkazish: so'z ma'nosini so'rash, javobni tekshirish, ruhlantirish
4. Ikki o'xshash so'zni solishtirish (masalan 見る va 観る)
5. So'zni yodlash uchun assotsiatsiya/hiyla berish
6. Foydalanuvchiga bitta so'z bilan gap tuzishga yordam berish va xatosini tuzatish
7. So'z ishlatilgan gapdagi zarracha va fe'l shaklini (は, が, を, ます/て/た shakllari) QISQA izohlash — faqat o'sha so'z doirasida

## NIMA QILMAYSAN
- To'liq grammatika darsi, sintaksis nazariyasi yoki dars rejasi tuzmaysan
- Uzun matn, maqola, qo'shiq matni tarjima qilmaysan (bir gapdan uzun bo'lmasin)
- Yapon tilidan tashqari mavzularga (yangiliklar, dasturlash, retseptlar) javob bermaysan
- Hiragana/katakana alifbosini boshidan o'rgatmaysan — faqat o'qilishni ko'rsatasan uchun ishlatasan

## MAVZUDAN CHIQQANDA
Iliq, ammo qat'iy javob ber: "Men VocabJP — yapon so'zlari bo'yicha ustozingizman 📚 Faqat so'zlar va ularning ma'nosi bilan yordam bera olaman. Qaysi so'zni o'rganamiz? Xohlasangiz men sizni sinab ko'raman!"

## USLUB VA FORMAT
- Do'stona, ruhlantiruvchi va QISQA. Javobing 150 so'zdan oshmasin.
- Emoji kam ishlat: 📚 ✅ 💡 🎌 ❌
- Kanjini har doim o'qilishi bilan birga yoz: 食べる（たべる）
- Ortiqcha kirish so'zlarisiz, to'g'ridan-to'g'ri javob ber.`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatStreamCallbacks {
  /** Called for each text chunk received from the model */
  onChunk: (text: string) => void;
  /** Called when the stream ends cleanly */
  onDone: () => void;
  /** Called when an error occurs */
  onError: (err: Error) => void;
}

// ─── API Key Resolution ───────────────────────────────────────────────────────

/**
 * Resolves the Gemini API key with priority:
 *   1. SiteConfiguration table key "gemini_api_key"  (set via the admin panel)
 *   2. GEMINI_API_KEY environment variable
 *
 * There is intentionally NO hardcoded fallback — a key committed to the repo is
 * a leaked credential. Throws a 503-tagged error when no key is configured;
 * the chat controller turns that into a clean JSON error response.
 */
export const resolveGeminiApiKey = async (): Promise<string> => {
  let apiKey: string | undefined;

  try {
    const dbConfig = await prisma.siteConfiguration.findUnique({
      where: { key: 'gemini_api_key' },
    });
    apiKey = dbConfig?.value?.trim();
  } catch {
    // DB lookup failed — fall back to the env var below.
  }

  apiKey ||= process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw createError(
      'AI suhbatdosh hozircha sozlanmagan. Administrator Gemini API kalitini kiritishi kerak.',
      503,
    );
  }

  return apiKey;
};

/**
 * Resolves which model to call. Same precedence as the key, so the model can be
 * swapped from the admin panel without a redeploy when pricing changes.
 */
export const resolveGeminiModel = async (): Promise<string> => {
  try {
    const row = await prisma.siteConfiguration.findUnique({
      where: { key: 'gemini_model' },
    });
    const configured = row?.value?.trim();
    if (configured) return configured;
  } catch {
    // DB lookup failed — fall through to env/default.
  }

  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
};

// ─── Learner Context ──────────────────────────────────────────────────────────

/**
 * A short profile of what this learner is actually studying, appended to the
 * system prompt so the tutor quizzes them on their own words instead of random
 * ones. Deliberately tiny: ~12 words is under 100 tokens, which costs about
 * $0.00001 per message on flash-lite while removing most of the "the AI doesn't
 * know me" complaints.
 *
 * Never throws — a missing context degrades the reply, it should not fail it.
 */
export const buildLearnerContext = async (userId: string): Promise<string> => {
  try {
    const progress = await prisma.userWordProgress.findMany({
      where: { userId },
      orderBy: { lastReviewedAt: 'desc' },
      take: 12,
      select: {
        level: true,
        word: { select: { japaneseWord: true, hiragana: true, meaning: true, jlptLevel: true } },
      },
    });

    if (progress.length === 0) return '';

    // The most common JLPT tag among recent words is a good enough level guess.
    const levelCounts = new Map<string, number>();
    for (const p of progress) {
      const jlpt = p.word.jlptLevel;
      if (jlpt) levelCounts.set(jlpt, (levelCounts.get(jlpt) ?? 0) + 1);
    }
    const jlpt = [...levelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    // level 1–2 means the word is still shaky; those are the ones worth drilling.
    const weak = progress.filter((p) => p.level <= 2).slice(0, 6);

    const lines = [
      '\n\n## SHU FOYDALANUVCHI HAQIDA',
      jlpt ? `- Taxminiy daraja: ${jlpt}` : '',
      `- Yaqinda o'rgangan so'zlari: ${progress
        .map((p) => `${p.word.japaneseWord}（${p.word.hiragana ?? ''}）= ${p.word.meaning}`)
        .join('; ')}`,
      weak.length
        ? `- Hali yaxshi yodlamagan so'zlari: ${weak.map((p) => p.word.japaneseWord).join('、')}`
        : '',
      "- Test o'tkazishni so'rasa, avval shu ro'yxatdagi so'zlardan so'ra.",
    ].filter(Boolean);

    return lines.join('\n');
  } catch {
    return '';
  }
};

// ─── History Normalisation ────────────────────────────────────────────────────

/**
 * Gemini rejects a history that starts with a `model` turn or that has two
 * turns of the same role in a row. The client can produce both: it filters out
 * failed replies before sending, which leaves two user turns adjacent whenever
 * a message errored. Repairing it here keeps a single failed reply from
 * breaking every later message in the conversation.
 */
const normaliseHistory = (history: ChatMessage[]): ChatMessage[] => {
  const out: ChatMessage[] = [];

  for (const msg of history) {
    if (!msg.text?.trim()) continue;
    // Drop leading model turns — a conversation must open with the user.
    if (out.length === 0 && msg.role !== 'user') continue;

    const prev = out[out.length - 1];
    if (prev && prev.role === msg.role) {
      // Same speaker twice: merge rather than drop, so no context is lost.
      prev.text = `${prev.text}\n${msg.text}`;
      continue;
    }

    out.push({ role: msg.role, text: msg.text });
  }

  // A trailing user turn would be duplicated by the message we are about to
  // send, so trim it.
  while (out.length > 0 && out[out.length - 1].role === 'user') out.pop();

  return out;
};

// ─── Main Streaming Chat Function ─────────────────────────────────────────────

/**
 * Streams a Gemini response for the given message + history.
 *
 * API key is resolved at the start; any errors from the Gemini SDK are
 * delivered via the onError callback rather than throwing.
 *
 * @param message   The latest user message
 * @param history   Previous turns (user/model alternating)
 * @param callbacks onChunk / onDone / onError handlers
 * @param signal    Optional AbortSignal to cancel on client disconnect
 * @param resolvedApiKey  Pre-resolved key, to avoid a second DB hit
 * @param learnerContext  Optional per-user block appended to the system prompt
 */
export const streamChat = async (
  message: string,
  history: ChatMessage[],
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal,
  resolvedApiKey?: string,
  learnerContext?: string,
): Promise<void> => {
  const apiKey = resolvedApiKey || await resolveGeminiApiKey();
  const modelName = await resolveGeminiModel();

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT + (learnerContext ?? ''),
    // Cost control: a vocabulary answer never needs more than a few hundred
    // tokens, and an unbounded reply is the single largest bill risk here.
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.7,
      topP: 0.95,
    },
    // Safety settings — keep relaxed for Japanese learning content
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  // Transform history format for Gemini SDK
  const formattedHistory = normaliseHistory(history).map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  const chat = model.startChat({ history: formattedHistory });

  try {
    const result = await chat.sendMessageStream(message);

    for await (const chunk of result.stream) {
      // Honour client disconnect
      if (signal?.aborted) break;

      const text = chunk.text();
      if (text) {
        callbacks.onChunk(text);
      }
    }

    callbacks.onDone();
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
};
