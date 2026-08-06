import TelegramBot from 'node-telegram-bot-api';
import prisma from '../lib/prisma';
import {
  PLAN_LABELS,
  type PlanId,
  approvePayment,
  attachReceipt,
  findAwaitingForChat,
  findByToken,
  getPaymentDetails,
  getRequest,
  markAwaitingReceipt,
  rejectPayment,
} from './payment.service';

/**
 * The payment bot — separate from the auth bot, with its own token.
 *
 * Flow:
 *   1. The web app creates a checkout and opens `t.me/<bot>?start=<token>`.
 *   2. `/start <token>` resolves the token to a purchase and shows the card
 *      details and the exact amount.
 *   3. The buyer sends a photo of the transfer receipt.
 *   4. The photo is forwarded to the admin chat with Approve / Reject buttons.
 *   5. Approving grants the premium and tells the buyer.
 *
 * The buyer is never asked to type their username: identity comes from the
 * deep-link token, which the web app minted for a signed-in session.
 */

const token = process.env.PAYMENT_BOT_TOKEN;
const adminChatId = process.env.PAYMENT_ADMIN_CHAT_ID;

/**
 * Telegram allows one polling connection per token. Running the bot on every
 * PM2 worker would make them fight over it (409 Conflict), so only instance 0
 * — or a single un-clustered process — starts it. Same guard as bot.service.
 */
const isPrimaryInstance =
  process.env.NODE_APP_INSTANCE === '0' || !process.env.NODE_APP_INSTANCE;

let bot: TelegramBot | null = null;

const money = (amount: number) => amount.toLocaleString('uz-UZ').replace(/,/g, ' ');

/** Escapes the characters Telegram's HTML parse mode would otherwise choke on. */
const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

if (!token) {
  console.warn('[PaymentBot] PAYMENT_BOT_TOKEN not set — payment bot disabled.');
} else if (!isPrimaryInstance) {
  console.log('[PaymentBot] Not the primary instance — payment bot not started.');
} else {
  bot = new TelegramBot(token, { polling: true });
  console.log('[PaymentBot] Started.');

  if (!adminChatId) {
    console.warn(
      '[PaymentBot] PAYMENT_ADMIN_CHAT_ID not set — receipts cannot be reviewed. ' +
        'Send /id to the bot to find your chat id.',
    );
  }

  // ── /id — how the operator discovers the chat id to put in .env ───────────
  bot.onText(/^\/id$/, (msg) => {
    bot!.sendMessage(
      msg.chat.id,
      `Chat ID: <code>${msg.chat.id}</code>\n\n` +
        "Buni <code>PAYMENT_ADMIN_CHAT_ID</code> ga yozing — cheklar shu yerga tushadi.",
      { parse_mode: 'HTML' },
    );
  });

  // ── /start <token> — opened from the website ──────────────────────────────
  bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const linkToken = match?.[1]?.trim();

    if (!linkToken) {
      await bot!.sendMessage(
        chatId,
        "👋 <b>VocabJP to'lov boti</b>\n\n" +
          "Premium sotib olish uchun saytdagi <b>Premium</b> sahifasiga o'ting va " +
          "tarifni tanlab <b>«Telegram orqali to'lash»</b> tugmasini bosing — " +
          "shundan so'ng bu yerga avtomatik qaytasiz.",
        { parse_mode: 'HTML' },
      );
      return;
    }

    const request = await findByToken(linkToken);
    if (!request) {
      await bot!.sendMessage(
        chatId,
        "❌ Havola eskirgan yoki allaqachon ishlatilgan.\n\n" +
          "Saytdagi Premium sahifasidan qaytadan boshlang.",
      );
      return;
    }

    await markAwaitingReceipt(request.id, String(msg.from?.id ?? ''), String(chatId));
    const details = await getPaymentDetails();

    if (!details.cardNumber) {
      await bot!.sendMessage(
        chatId,
        "⚠️ To'lov kartasi hali sozlanmagan. Iltimos, administratorga murojaat qiling.",
      );
      return;
    }

    await bot!.sendMessage(
      chatId,
      `🌸 <b>${esc(request.user.username)}</b>, tarifingiz tanlandi.\n\n` +
        `📦 Tarif: <b>${PLAN_LABELS[request.plan as PlanId] ?? request.plan}</b>\n` +
        `💰 Summa: <b>${money(request.amount)} so'm</b>\n\n` +
        `💳 Karta: <code>${esc(details.cardNumber)}</code>\n` +
        (details.cardHolder ? `👤 Egasi: <b>${esc(details.cardHolder)}</b>\n` : '') +
        `\n<b>Keyingi qadam:</b>\n` +
        `1️⃣ Yuqoridagi kartaga <b>aynan ${money(request.amount)} so'm</b> o'tkazing\n` +
        `2️⃣ To'lov chekining <b>rasmini shu yerga yuboring</b>\n\n` +
        `<i>Admin tekshirgach Premium avtomatik ulanadi — odatda bir necha soat ichida.</i>`,
      { parse_mode: 'HTML' },
    );
  });

  // ── Receipt photo ─────────────────────────────────────────────────────────
  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const request = await findAwaitingForChat(String(chatId));

    if (!request) {
      await bot!.sendMessage(
        chatId,
        "Hozir kutilayotgan to'lov yo'q. Saytdagi Premium sahifasidan tarifni tanlang.",
      );
      return;
    }

    // The largest size is last; Telegram keeps the file, we keep only its id.
    const fileId = msg.photo?.[msg.photo.length - 1]?.file_id;
    if (!fileId) return;

    const updated = await attachReceipt(request.id, fileId);

    await bot!.sendMessage(
      chatId,
      "✅ <b>Chek qabul qilindi!</b>\n\n" +
        "Administrator tekshirgach Premium hisobingizga ulanadi va shu yerga xabar keladi.\n\n" +
        "<i>Botni yopib qo'yishingiz mumkin.</i>",
      { parse_mode: 'HTML' },
    );

    if (!adminChatId) {
      console.warn('[PaymentBot] Receipt received but PAYMENT_ADMIN_CHAT_ID is not set.');
      return;
    }

    await bot!.sendPhoto(adminChatId, fileId, {
      caption:
        `🧾 <b>Yangi to'lov cheki</b>\n\n` +
        `👤 <b>${esc(updated.user.username)}</b>\n` +
        `${updated.user.email ? `✉️ ${esc(updated.user.email)}\n` : ''}` +
        `${updated.user.phone ? `📱 ${esc(updated.user.phone)}\n` : ''}` +
        `📦 ${PLAN_LABELS[updated.plan as PlanId] ?? updated.plan}\n` +
        `💰 <b>${money(updated.amount)} so'm</b>`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Tasdiqlash', callback_data: `ok:${updated.id}` },
          { text: '❌ Rad etish', callback_data: `no:${updated.id}` },
        ]],
      },
    });
  });

  // ── Admin decision ────────────────────────────────────────────────────────
  bot.on('callback_query', async (query) => {
    const data = query.data ?? '';
    const fromChat = String(query.message?.chat.id ?? '');

    // Only the configured admin chat may decide. Without this check anyone who
    // guessed a request id could approve their own payment.
    if (!adminChatId || fromChat !== String(adminChatId)) {
      await bot!.answerCallbackQuery(query.id, { text: 'Ruxsat yo‘q.' });
      return;
    }

    const [action, requestId] = data.split(':');
    if (!requestId) return;

    try {
      if (action === 'ok') {
        const result = await approvePayment(requestId, null);
        await bot!.answerCallbackQuery(query.id, {
          text: result.alreadyDone ? 'Allaqachon tasdiqlangan' : 'Tasdiqlandi ✅',
        });

        const full = await getRequest(requestId);
        if (full?.telegramChatId && !result.alreadyDone) {
          await bot!.sendMessage(
            full.telegramChatId,
            "🎉 <b>To'lovingiz tasdiqlandi!</b>\n\n" +
              `Premium hisobingizga ulandi — <b>${PLAN_LABELS[full.plan as PlanId] ?? full.plan}</b>.\n\n` +
              "Saytga qaytib sahifani yangilang.\n\n<i>Yapon tilini o'rganishda omad!</i> 🌸",
            { parse_mode: 'HTML' },
          );
        }
        await editDecided(query, '✅ TASDIQLANDI');
      } else if (action === 'no') {
        const rejected = await rejectPayment(requestId, null);
        await bot!.answerCallbackQuery(query.id, { text: 'Rad etildi' });

        if (rejected.telegramChatId) {
          await bot!.sendMessage(
            rejected.telegramChatId,
            "❌ <b>To'lov tasdiqlanmadi.</b>\n\n" +
              "Chek o'qilmadi yoki summa mos kelmadi bo'lishi mumkin. " +
              "Iltimos, administratorga murojaat qiling yoki qaytadan urinib ko'ring.",
            { parse_mode: 'HTML' },
          );
        }
        await editDecided(query, '❌ RAD ETILDI');
      }
    } catch (err) {
      console.error('[PaymentBot] Decision failed:', err);
      await bot!.answerCallbackQuery(query.id, {
        text: (err as Error).message?.slice(0, 180) ?? 'Xatolik',
        show_alert: true,
      });
    }
  });

  bot.on('polling_error', (err) => {
    console.error('[PaymentBot] Polling error:', err.message);
  });
}

/** Replaces the decision buttons with the outcome, so it cannot be pressed twice. */
const editDecided = async (query: TelegramBot.CallbackQuery, label: string) => {
  if (!bot || !query.message) return;
  try {
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [[{ text: label, callback_data: 'done' }]] },
      { chat_id: query.message.chat.id, message_id: query.message.message_id },
    );
  } catch {
    // Telegram rejects an edit that changes nothing — not worth reporting.
  }
};

/**
 * Tells a buyer their payment went through, for approvals made in the web
 * admin panel rather than in the bot.
 */
export const notifyApproved = async (requestId: string): Promise<void> => {
  if (!bot) return;
  const request = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
  if (!request?.telegramChatId) return;

  try {
    await bot.sendMessage(
      request.telegramChatId,
      "🎉 <b>To'lovingiz tasdiqlandi!</b>\n\nPremium hisobingizga ulandi.",
      { parse_mode: 'HTML' },
    );
  } catch (err) {
    console.error('[PaymentBot] Could not notify buyer:', err);
  }
};

export default bot;
