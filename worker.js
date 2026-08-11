export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Webhookni bir marta o'rnatish
    if (url.pathname === "/setup") {
      const result = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(
          `${url.origin}/`
        )}`
      );

      return new Response(await result.text(), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method !== "POST") {
      return new Response("Bot ishlayapti!", { status: 200 });
    }

    try {
      const update = await request.json();
      const message = update.message;

      if (!message) {
        return new Response("OK", { status: 200 });
      }

      const chatId = message.chat.id;
      const user = message.from;

      if (message.text === "/start") {
        await sendMessage(
          env.BOT_TOKEN,
          chatId,
          "Assalomu alaykum!\n\nBu murojaatlar boti.\nMurojaatingizni shu yerga yozib yuboring."
        );

        return new Response("OK");
      }

      const text =
        message.text || "Foydalanuvchi fayl yoki media yubordi.";

      const adminText =
        "📩 YANGI MUROJAAT\n\n" +
        `👤 Foydalanuvchi: ${user.first_name || ""} ${user.last_name || ""}\n` +
        `🆔 Telegram ID: ${user.id}\n` +
        `🔗 Username: @${user.username || "mavjud emas"}\n\n` +
        `📝 Murojaat:\n${text}`;

      if (env.ADMIN_ID) {
        await sendMessage(env.BOT_TOKEN, env.ADMIN_ID, adminText);
      }

      await sendMessage(
        env.BOT_TOKEN,
        chatId,
        "✅ Murojaatingiz qabul qilindi.\n\nMurojaatingiz mas'ul xodimga yuborildi."
      );

      return new Response("OK");
    } catch (error) {
      console.log(error);
      return new Response("OK");
    }
  }
};

async function sendMessage(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
}
