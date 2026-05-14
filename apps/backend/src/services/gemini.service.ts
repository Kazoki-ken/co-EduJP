import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import prisma from '../lib/prisma';

// ─── Vocabulary-Locked System Prompt ─────────────────────────────────────────

const SYSTEM_PROMPT = `You are VocabJP, an AI assistant with a single, strict purpose: helping users memorize and practice Japanese vocabulary words.

## Your Capabilities (ONLY these):
1. Explain the meaning, reading (hiragana/furigana), part-of-speech, and nuance of specific Japanese words
2. Provide 1–2 natural example sentences for a word with English translations
3. Quiz the user: ask them the meaning of a word, check their answer, and give encouraging feedback
4. Compare two similar vocabulary words and explain the difference in usage or nuance
5. Suggest memory tricks (mnemonics) for remembering a specific word
6. Help the user build one sentence using a specific vocabulary word they are studying
7. Confirm whether a user's stated meaning for a word is correct or not

## Strict Prohibitions (do NOT do any of these):
- Do NOT teach Japanese grammar rules, verb conjugations, particle usage, or sentence patterns
- Do NOT act as a general conversational Japanese partner or language tutor
- Do NOT translate paragraphs, articles, song lyrics, or any text longer than a single sentence
- Do NOT discuss topics unrelated to Japanese vocabulary (world news, coding, recipes, etc.)
- Do NOT teach the hiragana or katakana syllabaries as a system — only use them to show a word's reading
- Do NOT provide full Japanese language lesson plans, syllabuses, or textbook-style explanations
- Do NOT answer questions about Japanese culture, travel, food, or history unless a vocabulary word is the focus

## When the user asks for something outside your scope:
Respond warmly but firmly: "I'm VocabJP — your Japanese vocabulary coach! I can only help with specific words and their meanings. Shall we practice? Tell me a word you'd like to study, or I can quiz you on one! 📚"

## Tone & Format:
- Encouraging, friendly, and concise
- Use relevant emoji sparingly: 📚 ✅ 💡 🎌 ❌
- Keep responses under 200 words unless listing multiple example sentences
- Always show the word's reading in hiragana/katakana alongside kanji`;

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
 * Hardcoded fallback API key — used when neither the DB nor env var is set.
 * Priority: SiteConfiguration DB → GEMINI_API_KEY env var → fallback key.
 */
const FALLBACK_GEMINI_API_KEY = 'AIzaSyBHJq8nPqsinaIpk5NIEYbe1JjMWnAd_RQ';

/**
 * Resolves the Gemini API key with priority:
 *   1. SiteConfiguration table key "gemini_api_key"
 *   2. GEMINI_API_KEY environment variable
 *   3. Hardcoded fallback key
 *
 * Never throws — always returns a key.
 */
export const resolveGeminiApiKey = async (): Promise<string> => {
  try {
    const dbConfig = await prisma.siteConfiguration.findUnique({
      where: { key: 'gemini_api_key' },
    });

    const apiKey =
      dbConfig?.value?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      FALLBACK_GEMINI_API_KEY;

    return apiKey;
  } catch {
    // DB lookup failed — fall back to env or hardcoded key
    return process.env.GEMINI_API_KEY?.trim() || FALLBACK_GEMINI_API_KEY;
  }
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
 */
export const streamChat = async (
  message: string,
  history: ChatMessage[],
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal,
  resolvedApiKey?: string,
): Promise<void> => {
  const apiKey = resolvedApiKey || await resolveGeminiApiKey();

  const genAI = new GoogleGenerativeAI(apiKey);

  // Strictly use gemini-2.5-flash as the model
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
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
  const formattedHistory = history.map((msg) => ({
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
