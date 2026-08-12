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
      // MUROJAATNI KV'GA SAQLASH
      // ==============================
      const appealId =
        `appeal:${Date.now()}:${user.id}`;

      const appealData = {
        id: appealId,
        telegram_id: user.id,
        full_name: fullName,
        username: username,
        text: text,
        created_at: new Date().toISOString()
      };

      await env.USER_DATA.put(
        appealId,
        JSON.stringify(appealData)
      );

      // ==============================
      // ADMINGA XABAR
      // ==============================
      const adminText =
        "📩 YANGI MUROJAAT\n\n" +
        "👤 Foydalanuvchi: " +
        `${fullName}\n` +
        "🆔 Telegram ID: " +
        `${user.id}\n` +
        "🔗 Username: " +
        `${username}\n\n` +
        "📝 MUROJAAT:\n" +
        `${text}\n\n` +
        "💾 Murojaat bazaga saqlandi.";

      // ==============================
      // ADMINGA YUBORISH
      // ==============================
      if (env.ADMIN_ID) {
        await sendMessage(
          env.BOT_TOKEN,
          env.ADMIN_ID,
          adminText
        );
      }

      // ==============================
      // FOYDALANUVCHIGA TASDIQ
      // ==============================
      await sendMessage(
        env.BOT_TOKEN,
        chatId,
        "✅ Murojaatingiz qabul qilindi.\n\n" +
        "Murojaatingiz mas’ul xodimga yuborildi."
      );

      return new Response("OK", { status: 200 });

    } catch (error) {
      console.log("Xatolik:", error);

      return new Response("OK", { status: 200 });
    }
  }
};


// ==========================================
// TELEGRAM XABAR YUBORISH
// ==========================================

async function sendMessage(token, chatId, text) {
  const response = await fetch(
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

  return response;
  }
