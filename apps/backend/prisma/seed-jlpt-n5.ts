/**
 * N5 mock exam — first paper.
 *
 * Transcribed from the published JLPT N5 sample booklets. Run with:
 *   npx tsx prisma/seed-jlpt-n5.ts
 *
 * Re-running replaces the paper rather than duplicating it: the test row is
 * matched on (level, section, number) and its groups are deleted first, so the
 * script is safe to run after fixing a typo.
 *
 * The answers were determined by hand, not taken from an official key — they
 * are right to the best of our reading, but treat the paper as demo content
 * until a key is checked against it.
 */
import { PrismaClient, JlptLevel, JlptSection, JlptQuestionType, JlptSource } from '@prisma/client';

const prisma = new PrismaClient();

type Q = {
  /** Question number as printed. */
  n: number;
  /** The sentence. The word under test is given in `focus`. */
  stem: string;
  focus?: string;
  choices: string[];
  /** 1-based index of the correct choice. */
  answer: number;
  why?: string;
  /** Listening script for this item, read aloud by the app's Japanese voice. */
  passage?: string;
};

type Group = {
  n: number;
  type: JlptQuestionType;
  instruction: string;
  instructionUz: string;
  /** Shared material — a reading text or a notice the questions refer to. */
  passage?: string;
  questions: Q[];
};

// ─── 文字・語彙 (Moji · Goi) ─────────────────────────────────────────────────

const MOJI_GOI: Group[] = [
  {
    n: 1,
    type: JlptQuestionType.KANJI_READING,
    instruction: '＿＿＿の ことばは ひらがなで どう かきますか。',
    instructionUz: "Chizilgan so'z hiragana bilan qanday yoziladi?",
    questions: [
      { n: 1,  stem: 'あしたは 雨ですか。', focus: '雨', choices: ['ゆき', 'はれ', 'くもり', 'あめ'], answer: 4, why: '雨 — «ame», yomg\'ir.' },
      { n: 2,  stem: 'きょうしつで 書いて ください。', focus: '書いて', choices: ['かいて', 'きいて', 'はいて', 'ひいて'], answer: 1, why: '書く — «kaku», yozmoq.' },
      { n: 3,  stem: 'しゃしんは はこの 中に あります。', focus: '中', choices: ['そば', 'そと', 'なか', 'よこ'], answer: 3, why: '中 — «naka», ich.' },
      { n: 4,  stem: 'この いすは 小さいです。', focus: '小さい', choices: ['ちいさい', 'ちさい', 'しいさい', 'しさい'], answer: 1, why: '小さい — «chiisai», kichik.' },
      { n: 5,  stem: 'あしたは 火よう日です。', focus: '火よう日', choices: ['どようび', 'すいようび', 'かようび', 'にちようび'], answer: 3, why: '火よう日 — seshanba.' },
      { n: 6,  stem: 'きれいな 空ですね。', focus: '空', choices: ['いえ', 'うみ', 'にわ', 'そら'], answer: 4, why: '空 — «sora», osmon.' },
      { n: 7,  stem: 'せいとは 百人 います。', focus: '百人', choices: ['ひゃくにん', 'びゃくにん', 'ひゃくじん', 'びゃくじん'], answer: 1, why: '百人 — «hyaku-nin», yuz kishi.' },
      { n: 8,  stem: '魚が たくさん いますよ。', focus: '魚', choices: ['ねこ', 'とり', 'いぬ', 'さかな'], answer: 4, why: '魚 — «sakana», baliq.' },
      { n: 9,  stem: 'パンを 半分 ともだちに あげました。', focus: '半分', choices: ['はんふん', 'はんぶん', 'ほんぶん', 'ほんふん'], answer: 2, why: '半分 — «hanbun», yarmi.' },
      { n: 10, stem: 'ぎんこうと スーパーの 間に ほそい みちが あります。', focus: '間', choices: ['あいた', 'となり', 'あいだ', 'どなり'], answer: 3, why: '間 — «aida», orasi.' },
      { n: 11, stem: 'たまごを 三つ とって ください。', focus: '三つ', choices: ['いつつ', 'みっつ', 'さんつ', 'ごつ'], answer: 2, why: '三つ — «mittsu», uchta.' },
      { n: 12, stem: 'きょうは 元気が いいですね。', focus: '元気', choices: ['けんき', 'げんき', 'でんき', 'てんき'], answer: 2, why: '元気 — «genki», tetiklik.' },
    ],
  },
  {
    n: 2,
    type: JlptQuestionType.KANJI_WRITING,
    instruction: '＿＿＿の ことばは どう かきますか。',
    instructionUz: "Chizilgan so'z qanday yoziladi?",
    questions: [
      { n: 13, stem: 'この わいしゃつを ください。', focus: 'わいしゃつ', choices: ['ウイシャソ', 'ウイシャツ', 'ワイシャソ', 'ワイシャツ'], answer: 4, why: 'ワイシャツ — oq ko\'ylak; ワ va ツ.' },
      { n: 14, stem: 'わたしの くには かわが おおいです。', focus: 'かわ', choices: ['花', '山', '川', '木'], answer: 3, why: '川 — daryo.' },
      { n: 15, stem: 'ヤンさんの がっこうは どこですか。', focus: 'がっこう', choices: ['宇校', '学校', '宇枚', '学枚'], answer: 2, why: '学校 — maktab.' },
      { n: 16, stem: 'この ざっしを みて ください。', focus: 'みて', choices: ['見て', '買て', '貝て', '目て'], answer: 1, why: '見る — ko\'rmoq.' },
      { n: 17, stem: 'この カメラは たかいですね。', focus: 'たかい', choices: ['高い', '安い', '古い', '新い'], answer: 1, why: '高い — qimmat.' },
      { n: 18, stem: 'きのうは かいしゃを やすみました。', focus: 'かいしゃ', choices: ['公仕', '公社', '会仕', '会社'], answer: 4, why: '会社 — kompaniya.' },
      { n: 19, stem: 'まだ いわないで ください。', focus: 'いわないで', choices: ['行わないで', '立わないで', '言わないで', '食わないで'], answer: 3, why: '言う — aytmoq.' },
      { n: 20, stem: 'らいげつ けっこんします。', focus: 'らいげつ', choices: ['今月', '来月', '来週', '今週'], answer: 2, why: '来月 — kelasi oy.' },
    ],
  },
  {
    n: 3,
    type: JlptQuestionType.CONTEXT_FILL,
    instruction: '（　）に なにが はいりますか。',
    instructionUz: "Qavs ichiga qaysi so'z mos keladi?",
    questions: [
      { n: 21, stem: 'わたしの へやは この アパートの （　） です。', choices: ['ほん', 'さつ', 'だい', 'かい'], answer: 4, why: '階 — qavat.' },
      { n: 22, stem: 'その ナイフで りんごを （　） ください。', choices: ['おきて', 'つけて', 'しめて', 'きって'], answer: 4, why: '切る — kesmoq.' },
      { n: 23, stem: '（　） を わすれましたから、かんじが わかりません。', choices: ['じしょ', 'ちず', 'とけい', 'さいふ'], answer: 1, why: '辞書 — lug\'at.' },
      { n: 24, stem: 'わたしの うちは えきに ちかいですから、（　） です。', choices: ['べんり', 'じょうぶ', 'いっぱい', 'へた'], answer: 1, why: '便利 — qulay.' },
      { n: 25, stem: 'なつやすみは まいにち （　） で およぎました。', choices: ['レストラン', 'プール', 'エレベーター', 'ビル'], answer: 2, why: 'プール — basseyn.' },
      { n: 26, stem: 'しらない ことばが ありましたから、せんせいに （　） しました。', choices: ['しつもん', 'べんきょう', 'れんしゅう', 'じゅぎょう'], answer: 1, why: '質問 — savol bermoq.' },
      { n: 27, stem: 'この へやは あついですから、（　） を あけましょう。', choices: ['おふろ', 'まど', 'エアコン', 'テーブル'], answer: 2, why: '窓 — deraza.' },
      { n: 28, stem: 'きのうは がっこうで たくさん かんじを （　）。', choices: ['うりました', 'もちました', 'おぼえました', 'こまりました'], answer: 3, why: '覚える — yodlamoq.' },
      { n: 29, stem: 'この コーヒーは、さとうを たくさん いれましたから、（　） です。', choices: ['わかい', 'くろい', 'まるい', 'あまい'], answer: 4, why: '甘い — shirin.' },
      { n: 30, stem: 'つよい かぜが （　） います。', choices: ['ふいて', 'いそいで', 'とんで', 'はっして'], answer: 1, why: '吹く — shamol esmoq.' },
    ],
  },
  {
    n: 4,
    type: JlptQuestionType.PARAPHRASE,
    instruction: '＿＿＿の ぶんと だいたい おなじ いみの ぶんが あります。',
    instructionUz: "Ma'nosi taxminan bir xil bo'lgan gapni tanlang.",
    questions: [
      { n: 31, stem: 'これは りょうしんの しゃしんです。', choices: ['これは そふと そぼの しゃしんです。', 'これは ちちと ははの しゃしんです。', 'これは あにと おとうとの しゃしんです。', 'これは あねと いもうとの しゃしんです。'], answer: 2, why: '両親 — ota-ona, ya\'ni 父と母.' },
      { n: 32, stem: 'この ダンスは やさしいです。', choices: ['この ダンスは かんたんです。', 'この ダンスは たいへんです。', 'この ダンスは たのしいです。', 'この ダンスは つまらないです。'], answer: 1, why: 'やさしい = 簡単 — oson.' },
      { n: 33, stem: 'ふくを せんたくしました。', choices: ['ふくを ぬぎました。', 'ふくを わたしました。', 'ふくを あらいました。', 'ふくを きました。'], answer: 3, why: '洗濯 — yuvmoq, ya\'ni 洗う.' },
      { n: 34, stem: 'この へやは くらいですね。', choices: ['この へやは あかるいですね。', 'この へやは あかるくないですね。', 'この へやは しずかじゃ ないですね。', 'この へやは しずかですね。'], answer: 2, why: '暗い = 明るくない — yorug\' emas.' },
      { n: 35, stem: 'リーさんは もりさんに ペンを かしました。', choices: ['リーさんは もりさんに ペンを もらいました。', 'もりさんは リーさんに ペンを もらいました。', 'リーさんは もりさんに ペンを かりました。', 'もりさんは リーさんに ペンを かりました。'], answer: 4, why: 'Li berdi (貸す) → Mori oldi (借りる).' },
    ],
  },
];


// ─── 文法 (Bunpou) ────────────────────────────────────────────────────────────
//
// Written for this app rather than transcribed. The format follows the official
// paper — particle/form choice, then ★ ordering, then a cloze passage — but the
// sentences are our own, which keeps the paper clear of the sample booklet's
// copyright. Question 17 keeps the shape of the official ★ example because that
// shape is the thing being taught.

const BUNPOU: Group[] = [
  {
    n: 1,
    type: JlptQuestionType.GRAMMAR_FILL,
    instruction: '（　）に 何を 入れますか。',
    instructionUz: "Qavs ichiga qaysi shakl mos keladi?",
    questions: [
      { n: 1,  stem: 'わたしは まいあさ 7時（　）おきます。', choices: ['に', 'で', 'を', 'と'], answer: 1, why: 'Aniq vaqtdan keyin に qo\'yiladi.' },
      { n: 2,  stem: 'きのう ともだち（　）えいがを 見ました。', choices: ['が', 'と', 'を', 'へ'], answer: 2, why: '「〜と」 — kim bilan birga.' },
      { n: 3,  stem: 'この ペンは 田中さん（　）です。', choices: ['の', 'に', 'で', 'へ'], answer: 1, why: 'Egalik — 「〜の」.' },
      { n: 4,  stem: 'へやの なかに ねこ（　）います。', choices: ['を', 'が', 'は', 'の'], answer: 2, why: 'います bilan predmet が bilan keladi.' },
      { n: 5,  stem: 'わたしは まいにち パン（　）たべます。', choices: ['が', 'に', 'を', 'で'], answer: 3, why: 'To\'ldiruvchi — 「〜を」.' },
      { n: 6,  stem: 'がっこう（　）でんしゃで 行きます。', choices: ['に', 'まで', 'を', 'と'], answer: 2, why: '「〜まで」 — qayergacha.' },
      { n: 7,  stem: 'これは にほんご（　）本です。', choices: ['の', 'に', 'で', 'を'], answer: 1, why: 'Ot + の + ot.' },
      { n: 8,  stem: 'きょうは あついです（　）、まどを あけましょう。', choices: ['まで', 'から', 'より', 'など'], answer: 2, why: '「〜から」 — sabab.' },
      { n: 9,  stem: 'きのうは あまり さむく（　）でした。', choices: ['ない', 'ありません', 'じゃない', 'くない'], answer: 2, why: 'い-sifat inkori: さむく ありませんでした.' },
      { n: 10, stem: 'A「これは だれの かさですか。」B「わたし（　）です。」', choices: ['は', 'の', 'が', 'を'], answer: 2, why: '「わたしの」 — meniki.' },
      { n: 11, stem: 'まいばん 30ぷん（　）べんきょうします。', choices: ['など', 'しか', 'ぐらい', 'より'], answer: 3, why: '「〜ぐらい」 — taxminan.' },
      { n: 12, stem: 'つくえの うえに 本（　）ノートが あります。', choices: ['へ', 'や', 'を', 'に'], answer: 2, why: '「〜や」 — sanashda «va shunga o\'xshash».' },
      { n: 13, stem: 'わたしは くだもの（　）すきです。', choices: ['を', 'が', 'に', 'で'], answer: 2, why: 'すき bilan が ishlatiladi.' },
      { n: 14, stem: 'A「なに（　）のみますか。」B「おちゃを おねがいします。」', choices: ['が', 'に', 'を', 'で'], answer: 3, why: 'のむ — を bilan.' },
      { n: 15, stem: 'にちようびは どこ（　）も 行きませんでした。', choices: ['が', 'を', 'へ', 'の'], answer: 3, why: '「どこへも 〜ません」 — hech qayerga.' },
      { n: 16, stem: 'この へやは しずかで、きれい（　）。', choices: ['な', 'に', 'です', 'だ'], answer: 3, why: 'な-sifat + です.' },
    ],
  },
  {
    n: 2,
    type: JlptQuestionType.SENTENCE_ORDER,
    instruction: '★ に 入る ものは どれですか。',
    instructionUz: "Bo'laklarni to'g'ri tartibda joylang va ★ o'rniga tushganini tanlang.",
    questions: [
      { n: 17, stem: '（タクシーの 中で）\nA「すみません、つぎの ＿＿ ★ ＿＿ ＿＿ まがって ください。」\nB「はい、わかりました。」', choices: ['に', 'しんごう', '右', 'を'], answer: 4, why: 'To\'g\'ri tartib: しんごうを 右に まがって — ★ o\'rnida を.' },
      { n: 18, stem: 'A「たなかさんは どこですか。」\nB「＿＿ ★ ＿＿ ＿＿ います。」', choices: ['に', 'きょうしつ', 'の', 'なか'], answer: 3, why: 'きょうしつの なかに います — ★ o\'rnida の.' },
      { n: 19, stem: 'この ＿＿ ＿＿ ★ ＿＿ です。', choices: ['とても', 'は', 'おいしい', 'ケーキ'], answer: 1, why: 'この ケーキは とても おいしいです — ★ o\'rnida とても.' },
      { n: 20, stem: 'わたしは ＿＿ ★ ＿＿ ＿＿ ならいたいです。', choices: ['を', 'にほんご', 'で', 'がっこう'], answer: 3, why: 'がっこうで にほんごを ならいたいです — ★ o\'rnida で.' },
      { n: 21, stem: 'きのう ＿＿ ＿＿ ★ ＿＿ 行きました。', choices: ['と', 'に', 'ともだち', 'うみ'], answer: 4, why: 'ともだちと うみに 行きました — ★ o\'rnida うみ.' },
    ],
  },
  {
    n: 3,
    type: JlptQuestionType.CLOZE_PASSAGE,
    instruction: '22 から 26 に 何を 入れますか。文章の 意味を 考えて、えらんで ください。',
    instructionUz: "Matnning ma'nosiga qarab bo'shliqlarni to'ldiring.",
    passage:
      'わたしの あさ\n\n' +
      'わたしは まいあさ 6時に おきます。おきてから かおを あらって、あさごはんを 【22】。あさごはんは いつも パンと たまごです。\n' +
      '7時半に うちを 【23】、えきまで あるきます。えきから がっこう 【24】 でんしゃで 20分 かかります。\n' +
      'がっこうでは にほんごを べんきょうします。にほんごは むずかしいですが、【25】。\n' +
      'ひるごはんの あと、ともだち 【26】 としょかんで しゅくだいを します。',
    questions: [
      { n: 22, stem: '【22】', choices: ['たべたい', 'たべて', 'たべます', 'たべました'], answer: 3, why: 'Har kungi odat — hozirgi-kelasi zamon たべます.' },
      { n: 23, stem: '【23】', choices: ['入って', '出て', 'のって', 'おりて'], answer: 2, why: 'うちを 出る — uydan chiqmoq.' },
      { n: 24, stem: '【24】', choices: ['を', 'へ', 'から', 'まで'], answer: 4, why: 'えきから がっこうまで — dan ... gacha.' },
      { n: 25, stem: '【25】', choices: ['たのしく ないです', 'たのしいです', 'たのしく ありませんでした', 'たのしいでしょうか'], answer: 2, why: '「〜ですが、…」 — qarama-qarshilik: qiyin, lekin qiziqarli.' },
      { n: 26, stem: '【26】', choices: ['が', 'を', 'と', 'に'], answer: 3, why: 'ともだちと — do\'st bilan birga.' },
    ],
  },
];

// ─── 読解 (Dokkai) ────────────────────────────────────────────────────────────

const DOKKAI: Group[] = [
  {
    n: 4,
    type: JlptQuestionType.READING_SHORT,
    instruction: 'つぎの 文を 読んで、しつもんに こたえて ください。',
    instructionUz: "Matnni o'qing va savolga javob bering.",
    passage:
      '（ヤンさんの つくえの 上に、田中さんの メモが あります。）\n\n' +
      'ヤンさんへ\n\n' +
      'きょうは しごとが おそく なります。ばんごはんは れいぞうこの 中に あります。\n' +
      'あたためて たべて ください。くだものも かって きました。テーブルの 上に あります。\n\n' +
      '田中',
    questions: [
      {
        n: 27,
        stem: 'ヤンさんは ばんごはんを どう しますか。',
        choices: [
          'じぶんで つくります。',
          'れいぞうこの ものを あたためて たべます。',
          '田中さんと いっしょに たべます。',
          '店で たべます。',
        ],
        answer: 2,
        why: 'Xatda «reyzoukoning ichida, isitib yeng» deyilgan.',
      },
    ],
  },
  {
    n: 5,
    type: JlptQuestionType.READING_SHORT,
    instruction: 'つぎの 文を 読んで、しつもんに こたえて ください。',
    instructionUz: "Matnni o'qing va savolga javob bering.",
    passage:
      '（学校の おしらせ）\n\n' +
      'あしたの ごご、きょうしつの そうじを します。\n' +
      '1時から 3時まで きょうしつに 入る ことが できません。\n' +
      'としょかんは いつも どおり つかえます。',
    questions: [
      {
        n: 28,
        stem: 'あしたの 2時に できる ことは どれですか。',
        choices: [
          'きょうしつで べんきょうする。',
          'としょかんで 本を 読む。',
          'きょうしつで ひるごはんを たべる。',
          'なにも できない。',
        ],
        answer: 2,
        why: 'Sinfxona 1–3 gacha yopiq, kutubxona esa odatdagidek ishlaydi.',
      },
    ],
  },
  {
    n: 6,
    type: JlptQuestionType.READING_MID,
    instruction: 'つぎの 文を 読んで、しつもんに こたえて ください。',
    instructionUz: "Matnni o'qing va savollarga javob bering.",
    passage:
      'わたしは きょねんの 4月に 日本に 来ました。はじめは 日本語が ぜんぜん わかりませんでしたから、\n' +
      'まいにち とても こわかったです。店で かいものを する ときも、なにも 言えませんでした。\n\n' +
      '6月ごろ、学校で リンさんに あいました。リンさんも がいこくじんですが、日本語が とても じょうずです。\n' +
      'リンさんは わたしに 「まいにち 少しでも 日本語で 話しましょう」と 言いました。\n\n' +
      'それから、わたしは まいにち 学校の 先生や 店の 人と 日本語で 話しました。はじめは まちがえて、\n' +
      'はずかしかったです。でも、いまは 話す ことが たのしいです。',
    questions: [
      {
        n: 29,
        stem: 'この 人は はじめ、どうして こわかったですか。',
        choices: [
          'ともだちが いなかったから。',
          '日本語が わからなかったから。',
          '学校が とおかったから。',
          'お金が なかったから。',
        ],
        answer: 2,
        why: '«日本語が ぜんぜん わかりませんでしたから» — sabab o\'sha yerda aytilgan.',
      },
      {
        n: 30,
        stem: 'いま、この 人は 日本語を 話す ことを どう 思って いますか。',
        choices: [
          'はずかしいと 思って います。',
          'むずかしいと 思って います。',
          'たのしいと 思って います。',
          'こわいと 思って います。',
        ],
        answer: 3,
        why: 'Oxirgi jumla: «いまは 話す ことが たのしいです».',
      },
    ],
  },
  {
    n: 7,
    type: JlptQuestionType.INFO_SEARCH,
    instruction: '右の ページを 見て、しつもんに こたえて ください。',
    instructionUz: "Jadvalga qarab savolga javob bering.",
    passage:
      'にほんごクラスの あんない\n' +
      '─────────────────────────────\n' +
      'A クラス　月・水　18:00〜19:30　はじめての 人\n' +
      'B クラス　火・木　18:00〜19:30　すこし 話せる 人\n' +
      'C クラス　土　　　10:00〜12:00　はじめての 人\n' +
      'D クラス　土　　　13:00〜15:00　すこし 話せる 人\n' +
      '─────────────────────────────',
    questions: [
      {
        n: 31,
        stem:
          'マリさんは 日本語を はじめて ならいます。月曜日から 金曜日までは しごとが あって、\n' +
          'クラスに 行く ことが できません。マリさんは どの クラスに 入りますか。',
        choices: ['A クラス', 'B クラス', 'C クラス', 'D クラス'],
        answer: 3,
        why: 'Faqat shanba bo\'sh va u endi boshlayapti — C klass.',
      },
    ],
  },
];

// ─── 聴解 (Choukai) ───────────────────────────────────────────────────────────
//
// There is no recorded audio, so each item carries its script in `passage` and
// the runner reads it aloud with the app's Japanese voice. The script stays
// hidden while the exam is running — showing it would turn a listening question
// into a reading one — and is revealed in the review afterwards.

const CHOUKAI: Group[] = [
  {
    n: 1,
    type: JlptQuestionType.LISTEN_TASK,
    instruction: 'はなしを 聞いて、この あと 何を するか えらんで ください。',
    instructionUz: "Suhbatni tinglang va keyin nima qilishini tanlang.",
    questions: [
      {
        n: 32,
        stem: '女の 人は これから 何を しますか。',
        passage:
          '女：すみません、この 本を かりたいんですが。\n' +
          '男：はい。カードは ありますか。\n' +
          '女：いいえ、ありません。\n' +
          '男：じゃ、あそこの まどぐちで カードを つくって ください。それから ここへ 来て ください。',
        choices: ['本を かります。', 'カードを つくります。', '本を かえします。', 'うちへ かえります。'],
        answer: 2,
        why: 'Xodim avval kartochka ochishni aytdi.',
      },
      {
        n: 33,
        stem: '男の 人は はじめに 何を しますか。',
        passage:
          '男：もしもし、いま えきに つきました。\n' +
          '女：はい。バスていは えきの 前です。3ばんの バスに のって ください。\n' +
          '男：わかりました。\n' +
          '女：あ、その まえに きっぷを かって くださいね。',
        choices: ['バスに のります。', 'きっぷを かいます。', 'えきへ 行きます。', '電話を かけます。'],
        answer: 2,
        why: '«その まえに» — avval chipta olish kerak.',
      },
      {
        n: 34,
        stem: '学生は あした 何を もって きますか。',
        passage:
          '先生：あしたの テストは 9時からです。8時50分までに きょうしつへ 来て ください。\n' +
          'えんぴつと けしゴムを もって きて ください。じしょは つかいません。',
        choices: ['じしょ', 'えんぴつと けしゴム', 'きょうかしょ', 'ノートだけ'],
        answer: 2,
        why: 'Lug\'at kerak emas, faqat qalam va o\'chirg\'ich.',
      },
    ],
  },
  {
    n: 2,
    type: JlptQuestionType.LISTEN_POINT,
    instruction: 'はなしを 聞いて、しつもんに こたえて ください。',
    instructionUz: "Suhbatni tinglang va savolga javob bering.",
    questions: [
      {
        n: 35,
        stem: 'パーティーは いつですか。',
        passage:
          '女：山田さん、パーティーは 何曜日ですか。\n' +
          '男：はじめは 土曜日でしたが、日曜日に なりました。\n' +
          '女：そうですか。じゃあ、日曜日ですね。',
        choices: ['金曜日', '土曜日', '日曜日', '月曜日'],
        answer: 3,
        why: 'Shanbadan yakshanbaga ko\'chirilgan.',
      },
      {
        n: 36,
        stem: 'かばんは きょう いくらですか。',
        passage:
          '男：この かばんは いくらですか。\n' +
          '女：5000円です。でも、きょうは やすくて、4000円です。',
        choices: ['4000円', '5000円', '9000円', '500円'],
        answer: 1,
        why: 'Bugun chegirma bilan 4000 iyen.',
      },
      {
        n: 37,
        stem: '田中さんは いま どこに すんで いますか。',
        passage:
          '女：田中さんは どこに すんで いますか。\n' +
          '男：えきの ちかくの アパートです。前は 大学の となりに すんで いましたが、\n' +
          'きょねん ひっこしました。',
        choices: ['大学の となり', 'えきの ちかく', 'びょういんの 前', 'こうえんの うしろ'],
        answer: 2,
        why: 'Universitet yonida — avval; hozir bekat yaqinida.',
      },
    ],
  },
  {
    n: 3,
    type: JlptQuestionType.LISTEN_SPEECH,
    instruction: 'こんな とき、何と 言いますか。',
    instructionUz: "Bunday holatda nima deysiz?",
    questions: [
      {
        n: 38,
        stem: 'ともだちの いえに 入ります。何と 言いますか。',
        passage: 'ともだちの いえに 入ります。何と 言いますか。',
        choices: ['おじゃまします。', 'いってきます。', 'おかえりなさい。', 'ごちそうさま。'],
        answer: 1,
        why: 'Birovnikiga kirganda 「おじゃまします」 deyiladi.',
      },
      {
        n: 39,
        stem: '店で ぼうしを かいたいです。店の 人に 何と 言いますか。',
        passage: '店で ぼうしを かいたいです。店の 人に 何と 言いますか。',
        choices: ['これを ください。', 'どういたしまして。', 'いただきます。', 'さようなら。'],
        answer: 1,
        why: 'Sotib olmoqchi bo\'lganda 「これを ください」.',
      },
    ],
  },
  {
    n: 4,
    type: JlptQuestionType.LISTEN_RESPONSE,
    instruction: 'みじかい 文を 聞いて、いちばん いい へんじを えらんで ください。',
    instructionUz: "Qisqa gapni tinglang va eng mos javobni tanlang.",
    questions: [
      {
        n: 40,
        stem: 'いちばん いい へんじを えらんで ください。',
        passage: 'お名前は 何ですか。',
        choices: ['22さいです。', 'リンです。', '学生です。', '日本人です。'],
        answer: 2,
        why: 'Ism so\'ralgan — ism aytiladi.',
      },
      {
        n: 41,
        stem: 'いちばん いい へんじを えらんで ください。',
        passage: 'あしたも 来ますか。',
        choices: ['はい、来ました。', 'はい、来ます。', 'いいえ、来ます。', 'はい、来ません。'],
        answer: 2,
        why: 'Ertaga haqida — kelasi zamon, ha bilan mos.',
      },
      {
        n: 42,
        stem: 'いちばん いい へんじを えらんで ください。',
        passage: 'これ、どうぞ。',
        choices: ['ありがとうございます。', 'いってらっしゃい。', 'すみませんでした。', 'おやすみなさい。'],
        answer: 1,
        why: 'Biror narsa uzatilganda minnatdorchilik.',
      },
      {
        n: 43,
        stem: 'いちばん いい へんじを えらんで ください。',
        passage: 'お仕事は 何ですか。',
        choices: ['9時からです。', 'かいしゃいんです。', 'とうきょうです。', 'でんしゃです。'],
        answer: 2,
        why: 'Kasb so\'ralgan.',
      },
    ],
  },
];

// ─── Writer ───────────────────────────────────────────────────────────────────

const upsertTest = async (
  level: JlptLevel,
  section: JlptSection,
  number: number,
  minutes: number,
  title: string,
  groups: Group[],
) => {
  const existing = await prisma.jlptTest.findUnique({
    where: { level_section_number: { level, section, number } },
  });

  // Wipe the old paper so a re-run is a replacement, not a duplicate.
  if (existing) {
    await prisma.jlptQuestionGroup.deleteMany({ where: { testId: existing.id } });
  }

  const test = existing
    ? await prisma.jlptTest.update({
        where: { id: existing.id },
        data: { minutes, title, isPublished: true, source: JlptSource.OFFICIAL_SAMPLE },
      })
    : await prisma.jlptTest.create({
        data: {
          level, section, number, minutes, title,
          isPublished: true,
          source: JlptSource.OFFICIAL_SAMPLE,
        },
      });

  for (const g of groups) {
    await prisma.jlptQuestionGroup.create({
      data: {
        testId: test.id,
        number: g.n,
        type: g.type,
        instruction: g.instruction,
        instructionUz: g.instructionUz,
        passage: g.passage,
        sortOrder: g.n,
        questions: {
          create: g.questions.map((q) => ({
            number: q.n,
            stem: q.stem,
            focus: q.focus,
            explanationUz: q.why,
            transcript: q.passage,
            choices: {
              create: q.choices.map((text, i) => ({
                number: i + 1,
                text,
                isCorrect: i + 1 === q.answer,
              })),
            },
          })),
        },
      },
    });
  }

  const count = groups.reduce((n, g) => n + g.questions.length, 0);
  console.log(`  ${section} ${number}-test: ${groups.length} ta もんだい, ${count} ta savol`);
  return test;
};

const main = async () => {
  console.log('N5 birinchi imtihon yozilmoqda...');

  const test = await upsertTest(
    JlptLevel.N5,
    JlptSection.MOJI_GOI,
    1,
    20,
    'Moji · Goi — 1-test',
    MOJI_GOI,
  );

  await upsertTest(JlptLevel.N5, JlptSection.BUNPOU, 1, 20, 'Bunpou — 1-test', BUNPOU);
  await upsertTest(JlptLevel.N5, JlptSection.DOKKAI, 1, 20, 'Dokkai — 1-test', DOKKAI);
  await upsertTest(JlptLevel.N5, JlptSection.CHOUKAI, 1, 30, 'Choukai — 1-test', CHOUKAI);

  // Bind it to the full-exam set for N5, creating the set on first run.
  const set =
    (await prisma.jlptExamSet.findFirst({ where: { level: JlptLevel.N5 } })) ??
    (await prisma.jlptExamSet.create({
      data: {
        level: JlptLevel.N5,
        title: 'N5 — 1-imtihon',
        description: 'Toʻrt boʻlim ketma-ket, imtihon kunidagi sharoitda.',
        source: JlptSource.OFFICIAL_SAMPLE,
        isPublished: true,
      },
    }));
  await prisma.jlptTest.updateMany({
    where: { level: JlptLevel.N5, number: 1 },
    data: { setId: set.id },
  });

  console.log('Tayyor.');
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
