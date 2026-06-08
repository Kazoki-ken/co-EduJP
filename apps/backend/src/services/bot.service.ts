import TelegramBot from 'node-telegram-bot-api';
import prisma from '../lib/prisma';

let bot: TelegramBot | null = null;
const token = process.env.TELEGRAM_BOT_TOKEN;

// Vaqtinchalik kesh: chat_id -> session_token
const pendingAuthCache = new Map<number, string>();

if (token) {
  bot = new TelegramBot(token, { polling: true });

  console.log('Telegram Bot is starting...');

  // 1. /start {token} komandasi kelganda
  bot.onText(/^\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const sessionToken = match ? match[1] : null;

    if (!sessionToken) return;

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
      `Siz <b>VocabJP</b> tizimiga kirish arafasidasiz.\n` +
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

    // Muvaffaqiyatli!
    await prisma.authSession.update({
      where: { token: sessionToken },
      data: {
        status: 'VERIFIED',
        telegramId: String(contact.user_id),
      },
    });

    pendingAuthCache.delete(chatId);

    bot!.sendMessage(
      chatId,
      "✅ <b>Muvaffaqiyatli tasdiqlandi!</b> 🎉\n\nSiz endi botdan chiqib, <b>VocabJP sayti yoki ilovasiga</b> qaytishingiz mumkin. Tizimga avtomatik tarzda kirasiz.\n\n<i>Yapon tilini o'rganishda omad!</i> 🌸",
      {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true },
      }
    );
  });

  // Umumiy /start komandasi
  bot.onText(/^\/start$/, (msg) => {
    bot!.sendMessage(
      msg.chat.id,
      "🌸 <b>VocabJP Rasmiy Botiga Xush Kelibsiz!</b>\n\n" +
      "Bu bot orqali siz ilovamizga xavfsiz va tezkor tarzda kira olasiz.\n\n" +
      "Tizimga kirish uchun to'g'ridan-to'g'ri saytga yoki mobil ilovaga o'ting va <b>'Telefon orqali kirish'</b> tugmasini bosing.",
      { parse_mode: 'HTML' }
    );
  });

} else {
  console.warn('TELEGRAM_BOT_TOKEN is not set. Auth bot is disabled.');
}

export default bot;
