export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==============================
    // WEBHOOKNI O'RNATISH
    // ==============================
    if (url.pathname === "/setup") {
      const webhookUrl = `${url.origin}/`;

      const result = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
      );

      return new Response(await result.text(), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // ==============================
    // GET SO'ROVLAR
    // ==============================
    if (request.method !== "POST") {
      return new Response(
        "JIDU Murojaatlar boti ishlayapti! ✅",
        { status: 200 }
      );
    }

    try {
      // ==============================
      // TELEGRAM UPDATE
      // ==============================
      const update = await request.json();
      const message = update.message;

      if (!message) {
        return new Response("OK", { status: 200 });
      }

      const chatId = message.chat.id;
      const user = message.from;

      // ==============================
      // FOYDALANUVCHI MA'LUMOTLARI
      // ==============================
      const firstName = user.first_name || "";
      const lastName = user.last_name || "";

      const fullName =
        `${firstName} ${lastName}`.trim() || "Noma'lum";

      const username = user.username
        ? `@${user.username}`
        : "mavjud emas";

      // ==============================
      // TELEFON RAQAMI KELGAN BO'LSA
      // ==============================
      if (message.contact) {
        const phone =
          message.contact.phone_number || "Noma'lum";

        // Faqat foydalanuvchining o'z contact'i qabul qilinadi
        if (
          message.contact.user_id &&
          message.contact.user_id !== user.id
        ) {
          await sendMessage(
            env.BOT_TOKEN,
            chatId,
            "⚠️ Iltimos, o'zingizning telefon raqamingizni yuboring."
          );

          return new Response("OK", { status: 200 });
        }

        // Oxirgi murojaatni topamiz
        const lastAppealKey =
          await env.USER_DATA.get(
            `last_appeal:${chatId}`
          );

        if (lastAppealKey) {
          const appeal = await env.USER_DATA.get(
            lastAppealKey,
            "json"
          );

          if (appeal) {
            appeal.phone = phone;
            appeal.phone_added_at =
              new Date().toISOString();

            await env.USER_DATA.put(
              lastAppealKey,
              JSON.stringify(appeal)
            );

            // ADMINGA TELEFON RAQAMI
            if (env.ADMIN_ID) {
              const phoneText =
                "📞 TELEFON RAQAMI QOLDIRILDI\n\n" +
                `👤 Foydalanuvchi: ${appeal.full_name}\n` +
                `🆔 Telegram ID: ${appeal.telegram_id}\n` +
                `🔗 Username: ${appeal.username}\n` +
                `📱 Telefon: ${phone}\n\n` +
                "📝 MUROJAAT:\n" +
                `${appeal.text}`;

              await sendMessage(
                env.BOT_TOKEN,
                env.ADMIN_ID,
                phoneText
              );
            }
          }
        }

        // Klaviaturani olib tashlash
        await sendMessageRemoveKeyboard(
          env.BOT_TOKEN,
          chatId,
          "✅ Telefon raqamingiz qabul qilindi.\n\n" +
          "Zarur bo‘lsa, mas’ul xodim siz bilan bog‘lanadi."
        );

        return new Response("OK", { status: 200 });
      }

      // ==============================
      // "KERAK EMAS" TUGMASI
      // ==============================
      if (
        message.text === "❌ Telefon raqamini qoldirmayman"
      ) {
        await sendMessageRemoveKeyboard(
          env.BOT_TOKEN,
          chatId,
          "Tushunarli. ✅\n\n" +
          "Murojaatingiz telefon raqamisiz ham qabul qilindi."
        );

        return new Response("OK", { status: 200 });
      }

      // ==============================
      // /START
      // ==============================
      if (message.text === "/start") {
        const startText =
          "Assalomu alaykum! 👋\n\n" +
          "Siz Jahon iqtisodiyoti va diplomatiya universitetining " +
          "murojaatlar botiga tashrif buyurdingiz.\n\n" +
          "📩 Ushbu bot orqali Universitetga murojaat, " +
          "taklif yoki fikringizni yuborishingiz mumkin.\n\n" +
          "Murojaatingiz mas’ul xodimga yetkaziladi.\n\n" +
          "✍️ Murojaatingizni yuborish uchun murojaatingizni " +
          "shu yerga yozib yuboring.";

        await sendMessage(
          env.BOT_TOKEN,
          chatId,
          startText
        );

        return new Response("OK", { status: 200 });
      }

      // ==============================
      // MUROJAAT MATNI
      // ==============================
      const text =
        message.text ||
        "Foydalanuvchi fayl yoki media yubordi.";

      // ==============================
      // MUROJAAT ID
      // ==============================
      const appealId =
        `appeal:${Date.now()}:${user.id}`;

      // ==============================
      // MUROJAAT MA'LUMOTLARI
      // ==============================
      const appealData = {
        id: appealId,
        telegram_id: user.id,
        chat_id: chatId,
        full_name: fullName,
        username: username,
        text: text,
        phone: null,
        created_at: new Date().toISOString()
      };

      // ==============================
      // KV'GA SAQLASH
      // ==============================
      await env.USER_DATA.put(
        appealId,
        JSON.stringify(appealData)
      );

      // Oxirgi murojaatni foydalanuvchi bilan bog'lash
      await env.USER_DATA.put(
        `last_appeal:${chatId}`,
        appealId
      );

      // ==============================
      // ADMINGA XABAR
      // ==============================
      const adminText =
        "📩 YANGI MUROJAAT\n\n" +
        `👤 Foydalanuvchi: ${fullName}\n` +
        `🆔 Telegram ID: ${user.id}\n` +
        `🔗 Username: ${username}\n\n` +
        "📝 MUROJAAT:\n" +
        `${text}\n\n` +
        "📞 Telefon raqami: hozircha berilmagan\n" +
        "💾 Murojaat bazaga saqlandi.";

      if (env.ADMIN_ID) {
        await sendMessage(
          env.BOT_TOKEN,
          env.ADMIN_ID,
          adminText
        );
      }

      // ==============================
      // MUROJAAT QABUL QILINGANI HAQIDA
      // ==============================
      await sendMessage(
        env.BOT_TOKEN,
        chatId,
        "✅ Murojaatingiz qabul qilindi.\n\n" +
        "Murojaatingiz mas’ul xodimga yuborildi."
      );

      // ==============================
      // TELEFON RAQAMI — IXTIYORIY
      // ==============================
      await sendPhoneRequest(
        env.BOT_TOKEN,
        chatId
      );

      return new Response("OK", { status: 200 });

    } catch (error) {
      console.log("Xatolik:", error);

      return new Response("OK", { status: 200 });
    }
  }
};


// ==========================================
// ODDIY XABAR YUBORISH
// ==========================================

async function sendMessage(token, chatId, text) {
  return await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    }
  );
}


// ==========================================
// TELEFON RAQAMINI SO'RASH
// ==========================================

async function sendPhoneRequest(token, chatId) {
  return await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        chat_id: chatId,

        text:
          "📞 Agar lozim deb topsangiz, mas’ul xodim siz bilan " +
          "bog‘lanishini xohlasangiz, telefon raqamingizni qoldiring.\n\n" +
          "Telefon raqamingizni qoldirish ixtiyoriy.",

        reply_markup: {
          keyboard: [
            [
              {
                text: "📱 Telefon raqamimni yuborish",
                request_contact: true
              }
            ],
            [
              {
                text: "❌ Telefon raqamini qoldirmayman"
              }
            ]
          ],

          resize_keyboard: true,

          one_time_keyboard: true
        }
      })
    }
  );
}


// ==========================================
// KLAVIATURANI OLIB TASHLASH
// ==========================================

async function sendMessageRemoveKeyboard(
  token,
  chatId,
  text
) {
  return await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        chat_id: chatId,
        text: text,

        reply_markup: {
          remove_keyboard: true
        }
      })
    }
  );
}
