
import TelegramBot from 'node-telegram-bot-api';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

let bot: TelegramBot | null = null;
const token = process.env.TELEGRAM_BOT_TOKEN;

// Vaqtinchalik kesh: chat_id -> session_token
const pendingAuthCache = new Map<number, string>();

interface RegState {
  token: string;
  phone: string;
  step: 'WAITING_USERNAME' | 'WAITING_PASSWORD';
  username?: string;
  /** For the sweep below — these maps used to grow for the process's lifetime. */
  startedAt: number;
}
const regCache = new Map<number, RegState>();

/** How long a half-finished registration stays in memory. */
const REG_TTL_MS = 20 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - REG_TTL_MS;
  for (const [chatId, state] of regCache) {
    if (state.startedAt < cutoff) {
      regCache.delete(chatId);
      pendingAuthCache.delete(chatId);
    }
  }
}, 5 * 60 * 1000).unref();

/** Branding, so the bot does not hardcode a name the admin panel can change. */
const SITE_NAME = process.env.SITE_NAME || 'EduJP';
const SITE_URL = process.env.SITE_URL || 'https://edujp.uz';

// Faqat bitta PM2 instanceda botni ishga tushirish (Conflict oldini olish uchun)
const isPrimaryInstance = process.env.NODE_APP_INSTANCE === '0' || !process.env.NODE_APP_INSTANCE;

console.log('--- BOT SERVICE LOADED ---');
console.log('TOKEN EXISTS:', !!token);
console.log('NODE_APP_INSTANCE:', process.env.NODE_APP_INSTANCE);
console.log('IS_PRIMARY:', isPrimaryInstance);

if (token && isPrimaryInstance) {
  bot = new TelegramBot(token, { polling: true });

  console.log('Telegram Bot is starting on instance', process.env.NODE_APP_INSTANCE || 'single');

  // /start komandasini ushlash (token bilan yoki tokensiz)
  bot.onText(/^\/start(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const sessionToken = match && match[1] ? match[1] : null;

    // A bare `/start` also matches this pattern, so this branch is the only
    // greeting. The separate `/^\/start$/` handler that used to sit at the
    // bottom of this file fired *as well*, sending two messages every time.
    if (!sessionToken) {
      bot?.sendMessage(
        chatId,
        `🌸 <b>${SITE_NAME} botiga xush kelibsiz!</b>\n\n` +
        `Bu bot orqali saytga xavfsiz ro'yxatdan o'tasiz.\n\n` +
        `Boshlash uchun saytga o'ting va <b>«Boshlash» → «Telefon»</b> tugmasini bosing — ` +
        `shundan keyin bu yerga qaytasiz.`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: "🌐 Saytga o'tish", url: SITE_URL }]],
          },
        },
      );
      return;
    }

    // Sessiyani bazadan tekshirish
    const session = await prisma.authSession.findUnique({
      where: { token: sessionToken },
    });

    if (!session || session.status !== 'PENDING') {
      bot!.sendMessage(chatId, "❌ Ushbu kirish havolasi eskirgan yoki noto'g'ri. Iltimos saytdan qaytadan urinib ko'ring.");
      return;
    }

    if (new Date() > session.expiresAt) {
      await prisma.authSession.update({ where: { id: session.id }, data: { status: 'EXPIRED' } });
      bot!.sendMessage(chatId, "⏳ Havola vaqti tugagan. Qaytadan raqam kiritib ko'ring.");
      return;
    }

    // Saqlab qo'yamiz va Kontakt so'raymiz
    pendingAuthCache.set(chatId, sessionToken);

    bot!.sendMessage(
      chatId,
      `🎌 <b>Xush kelibsiz, Nihongo O'rganuvchi!</b>\n\n` +
      `Siz <b>${SITE_NAME}</b> tizimiga kirish arafasidasiz.\n` +
      `Xavfsizlikni ta'minlash maqsadida, iltimos pastdagi <b>📱 Raqamni yuborish</b> tugmasini bosing.\n\n` +
      `<i>⚠️ Eslatma: Telegramdagi raqamingiz saytda kiritilgan raqam bilan bir xil bo'lishi shart!</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [
            [
              {
                text: '📱 Raqamni yuborish (Tasdiqlash)',
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  });

  // 2. Foydalanuvchi kontakt jo'natganda
  bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const contact = msg.contact;

    if (!contact) return;

    const sessionToken = pendingAuthCache.get(chatId);
    if (!sessionToken) {
      bot!.sendMessage(chatId, "❌ <b>Kechirasiz, tasdiqlash vaqti tugagan yoki xato!</b>\n\nIltimos, saytga qaytib havolani yangilang va qaytadan bosing.", { parse_mode: 'HTML' });
      return;
    }

    // Xavfsizlik: Bu kontakt rostdan shu odamnikimi?
    if (contact.user_id !== msg.from?.id) {
      bot!.sendMessage(chatId, "⛔ <b>Xatolik!</b>\nIltimos, boshqaning emas, faqat o'zingizning raqamingizni yuboring!", { parse_mode: 'HTML' });
      return;
    }

    const session = await prisma.authSession.findUnique({
      where: { token: sessionToken },
    });

    if (!session || session.status !== 'PENDING') return;

    // Raqamlardagi ortiqcha belgilarni tozalab solishtiramiz
    const cleanContactPhone = contact.phone_number.replace(/\D/g, '');
    const cleanSessionPhone = session.phone.replace(/\D/g, '');

    if (!cleanContactPhone.includes(cleanSessionPhone) && !cleanSessionPhone.includes(cleanContactPhone)) {
      bot!.sendMessage(chatId, `🚫 <b>Raqamlar mos kelmadi!</b>\n\nSaytga kiritilgan raqam: <code>${session.phone}</code>\nSizning raqamingiz esa mos emas.`, { parse_mode: 'HTML' });
      return;
    }

    // Check if the user already exists in DB
    const phoneToSearch = cleanContactPhone.startsWith('998') ? `+${cleanContactPhone}` : `+${cleanContactPhone}`;
    const existingUser = await prisma.user.findUnique({
      where: { phone: phoneToSearch }
    });

    if (existingUser) {
      // User is already registered - fail/expire session and redirect them to login in the app
      await prisma.authSession.update({
        where: { token: sessionToken },
        data: { status: 'EXPIRED' }
      });
      pendingAuthCache.delete(chatId);
      
      await bot!.sendMessage(chatId, "❌ <b>Siz allaqachon ro'yxatdan o'tgansiz!</b>\n\nIltimos, ilovaga/saytga qaytib kirish uchun parolingizni kiriting.", {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true }
      });
      return;
    }

    // One Telegram account cannot hold two site accounts — the column is
    // unique, so without this check the create below throws a raw P2002 and
    // the user only sees "Xatolik yuz berdi".
    const telegramOwner = await prisma.user.findUnique({
      where: { telegramId: String(msg.from?.id) },
    });

    if (telegramOwner) {
      await prisma.authSession.update({
        where: { token: sessionToken },
        data: { status: 'EXPIRED' },
      });
      pendingAuthCache.delete(chatId);

      await bot!.sendMessage(
        chatId,
        `❌ <b>Bu Telegram hisobi allaqachon band!</b>\n\n` +
        `U <code>${telegramOwner.username}</code> nomli hisobga bog'langan. ` +
        `Saytga o'sha hisob bilan kiring.`,
        { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } },
      );
      return;
    }

    /**
     * The web session lives 5 minutes, which is enough to open Telegram but
     * not enough to also pick a username and a password — people were being
     * timed out mid-typing and the site stopped polling. The phone is verified
     * at this point, so extend the window.
     */
    await prisma.authSession.update({
      where: { token: sessionToken },
      data: { expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });

    // User does not exist, start the registration steps
    regCache.set(chatId, {
      token: sessionToken,
      phone: phoneToSearch,
      step: 'WAITING_USERNAME',
      startedAt: Date.now(),
    });

    await bot!.sendMessage(chatId, "Telefon raqamingiz muvaffaqiyatli tasdiqlandi! ✅", {
      reply_markup: { remove_keyboard: true }
    });

    bot!.sendMessage(
      chatId,
      "🎌 <b>Yangi foydalanuvchi!</b>\n\nRo'yxatdan o'tishni yakunlash uchun o'zingizga <b>foydalanuvchi nomi (username)</b> tanlang:\n\n<i>(Faqat ingliz harflari, raqamlar va tag chiziq, 3-30 ta belgi)</i>",
      { parse_mode: 'HTML' }
    );
  });

  // 3. Matnli xabarlar bilan ro'yxatdan o'tish qadamlarini boshqarish
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text || text.startsWith('/')) return;

    const state = regCache.get(chatId);
    if (!state) return;

    if (state.step === 'WAITING_USERNAME') {
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(text)) {
        bot!.sendMessage(chatId, "❌ <b>Foydalanuvchi nomi xato!</b>\n\nFoydalanuvchi nomi 3 dan 30 gacha belgidan iborat bo'lishi va faqat lotin harflari, raqamlar va tag chiziqdan (_) tashkil topishi kerak.\n\nIltimos, boshqa nom kiritib ko'ring:", { parse_mode: 'HTML' });
        return;
      }

      // Check username uniqueness in DB
      const existingUser = await prisma.user.findUnique({
        where: { username: text }
      });
      if (existingUser) {
        bot!.sendMessage(chatId, "❌ <b>Bu foydalanuvchi nomi allaqachon band!</b>\n\nIltimos, boshqa foydalanuvchi nomini kiriting:", { parse_mode: 'HTML' });
        return;
      }

      state.username = text;
      state.step = 'WAITING_PASSWORD';
      regCache.set(chatId, state);

      bot!.sendMessage(chatId, "✅ <b>Foydalanuvchi nomi qabul qilindi!</b>\n\nEndi tizimga kirish uchun <b>parol</b> kiriting (kamida 8 ta belgi bo'lishi shart):", { parse_mode: 'HTML' });
      return;
    }

    if (state.step === 'WAITING_PASSWORD') {
      if (text.length < 8) {
        bot!.sendMessage(chatId, "❌ <b>Parol juda qisqa!</b>\n\nParol kamida 8 ta belgidan iborat bo'lishi kerak. Iltimos, qaytadan kiriting:", { parse_mode: 'HTML' });
        return;
      }

      // The password is now sitting in the chat history in plain text. Bots may
      // delete incoming messages in private chats, so remove it immediately.
      try {
        await bot!.deleteMessage(chatId, msg.message_id);
      } catch {
        // Older than 48h or deletion disabled — not worth failing signup over.
      }

      try {
        // The site stops polling once the session lapses, so creating the
        // account here would leave the browser stuck on "kutilmoqda" with a
        // user that silently exists.
        const session = await prisma.authSession.findUnique({ where: { token: state.token } });
        if (!session || session.status !== 'PENDING' || new Date() > session.expiresAt) {
          regCache.delete(chatId);
          pendingAuthCache.delete(chatId);
          bot!.sendMessage(
            chatId,
            "⏳ <b>Havola vaqti tugagan.</b>\n\nHisob yaratilmadi. Iltimos, saytga qaytib raqamingizni qaytadan kiriting.",
            { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: "🌐 Saytga o'tish", url: SITE_URL }]] } },
          );
          return;
        }

        const passwordHash = await bcrypt.hash(text, 12);

        // Create the user
        const user = await prisma.user.create({
          data: {
            username: state.username!,
            phone: state.phone,
            telegramId: String(msg.from?.id),
            passwordHash,
            profile: {
              create: {
                streak: 0,
                lastLoginDate: new Date(),
              }
            }
          }
        });

        // Set session status to VERIFIED and link user
        await prisma.authSession.update({
          where: { token: state.token },
          data: {
            status: 'VERIFIED',
            telegramId: String(msg.from?.id),
            userId: user.id
          }
        });

        regCache.delete(chatId);
        pendingAuthCache.delete(chatId);

        bot!.sendMessage(
          chatId,
          `🎉 <b>Tabriklaymiz! Ro'yxatdan muvaffaqiyatli o'tdingiz.</b>\n\n` +
          `Endi <b>${SITE_NAME}</b> saytiga qayting — tizimga avtomatik kirasiz.\n\n` +
          `<i>Yapon tilini o'rganishda omad!</i> 🌸`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🌐 Saytga qaytish", url: SITE_URL }
                ]
              ]
            }
          }
        );
      } catch (err) {
        console.error('Error in bot registration creation:', err);
        bot!.sendMessage(chatId, "❌ <b>Xatolik yuz berdi!</b>\n\nRo'yxatdan o'tish jarayonida xatolik yuz berdi. Iltimos, saytdan qaytadan urinib ko'ring.");
        regCache.delete(chatId);
      }
      return;
    }
  });

} else {
  console.warn('TELEGRAM_BOT_TOKEN is not set. Auth bot is disabled.');
}

export default bot;
