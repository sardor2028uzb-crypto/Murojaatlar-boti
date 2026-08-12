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
      // TELEFON RAQAMI
      // ==============================
      if (message.contact) {
        const phone =
          message.contact.phone_number || "Noma'lum";

        // Faqat o'z telefon raqamini qabul qilish
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

        // Oxirgi murojaatni topish
        const lastAppealKey =
          await env.USER_DATA.get(
            `last_appeal:${chatId}`
          );

        if (lastAppealKey) {
          const appeal =
            await env.USER_DATA.get(
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

            // ==============================
            // ADMINGA TELEFON RAQAMI
            // ==============================
            if (env.ADMIN_ID) {
              const phoneText =
                "📞 TELEFON RAQAMI QOLDIRILDI\n\n" +
                `👤 Foydalanuvchi: ${appeal.full_name}\n` +
                `🆔 Telegram ID: ${appeal.telegram_id}\n` +
                `🔗 Username: ${appeal.username}\n` +
                `📱 Telefon: ${phone}\n\n` +
                "📝 MUROJAAT:\n" +
                `${appeal.text || "Media murojaat"}`;

              await sendMessage(
                env.BOT_TOKEN,
                env.ADMIN_ID,
                phoneText
              );
            }
          }
        }

        await sendMessageRemoveKeyboard(
          env.BOT_TOKEN,
          chatId,
          "✅ Telefon raqamingiz qabul qilindi.\n\n" +
          "Zarur bo‘lsa, mas’ul xodim siz bilan bog‘lanadi."
        );

        return new Response("OK", { status: 200 });
      }

      // ==============================
      // TELEFON RAQAMINI QOLDIRMASLIK
      // ==============================
      if (
        message.text ===
        "❌ Telefon raqamini qoldirmayman"
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
      // MUROJAAT TURINI ANIQLASH
      // ==============================
      let mediaType = "text";
      let fileId = null;
      let caption = message.caption || "";

      if (message.photo) {
        mediaType = "photo";

        // Eng katta o'lchamdagi rasm
        fileId =
          message.photo[
            message.photo.length - 1
          ].file_id;
      }

      else if (message.video) {
        mediaType = "video";
        fileId = message.video.file_id;
      }

      else if (message.voice) {
        mediaType = "voice";
        fileId = message.voice.file_id;
      }

      else if (message.document) {
        mediaType = "document";
        fileId = message.document.file_id;
      }

      else if (message.audio) {
        mediaType = "audio";
        fileId = message.audio.file_id;
      }

      else if (message.video_note) {
        mediaType = "video_note";
        fileId = message.video_note.file_id;
      }

      else if (message.text) {
        mediaType = "text";
      }

      else {
        mediaType = "other";
      }

      // ==============================
      // MUROJAAT MATNI
      // ==============================
      let text = "";

      if (message.text) {
        text = message.text;
      }

      else if (caption) {
        text = caption;
      }

      else {
        text =
          `Foydalanuvchi ${getMediaName(mediaType)} yubordi.`;
      }

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
        media_type: mediaType,
        file_id: fileId,
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
      // ADMIN UCHUN MA'LUMOT
      // ==============================
      const adminHeader =
        "📩 YANGI MUROJAAT\n\n" +
        `👤 Foydalanuvchi: ${fullName}\n` +
        `🆔 Telegram ID: ${user.id}\n` +
        `🔗 Username: ${username}\n` +
        `📂 Turi: ${getMediaName(mediaType)}\n\n` +
        "📝 MUROJAAT:\n" +
        `${text}\n\n` +
        "📞 Telefon raqami: hozircha berilmagan\n" +
        "💾 Murojaat bazaga saqlandi.";

      // ==============================
      // ADMINGA YUBORISH
      // ==============================
      if (env.ADMIN_ID) {

        // Avval ma'lumot
        await sendMessage(
          env.BOT_TOKEN,
          env.ADMIN_ID,
          adminHeader
        );

        // Keyin media bo'lsa media
        if (fileId) {
          await sendMediaToAdmin(
            env.BOT_TOKEN,
            env.ADMIN_ID,
            mediaType,
            fileId,
            caption
          );
        }
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

      // ==============================
      // TELEFON RAQAMI — IXTIYORIY
      // ==============================
      await sendPhoneRequest(
        env.BOT_TOKEN,
        chatId
      );

      return new Response("OK", {
        status: 200
      });

    } catch (error) {
      console.log("Xatolik:", error);

      return new Response("OK", {
        status: 200
      });
    }
  }
};


// ==========================================
// ODDIY XABAR YUBORISH
// ==========================================

async function sendMessage(
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
        text: text
      })
    }
  );
}


// ==========================================
// MEDIA NOMI
// ==========================================

function getMediaName(type) {
  switch (type) {
    case "photo":
      return "🖼️ Rasm";

    case "video":
      return "🎥 Video";

    case "voice":
      return "🎤 Ovozli xabar";

    case "document":
      return "📎 Fayl";

    case "audio":
      return "🎵 Audio";

    case "video_note":
      return "📹 Video message";

    case "text":
      return "📝 Matn";

    default:
      return "📂 Media";
  }
}


// ==========================================
// MEDIA'NI ADMINGA YUBORISH
// ==========================================

async function sendMediaToAdmin(
  token,
  adminId,
  mediaType,
  fileId,
  caption
) {
  let method = null;

  if (mediaType === "photo") {
    method = "sendPhoto";
  }

  else if (mediaType === "video") {
    method = "sendVideo";
  }

  else if (mediaType === "voice") {
    method = "sendVoice";
  }

  else if (mediaType === "document") {
    method = "sendDocument";
  }

  else if (mediaType === "audio") {
    method = "sendAudio";
  }

  else if (mediaType === "video_note") {
    method = "sendVideoNote";
  }

  if (!method) {
    return;
  }

  const body = {
    chat_id: adminId
  };

  // Telegram media metodlarida file_id shu nom bilan yuboriladi
  if (mediaType === "photo") {
    body.photo = fileId;
  }

  else if (mediaType === "video") {
    body.video = fileId;
  }

  else if (mediaType === "voice") {
    body.voice = fileId;
  }

  else if (mediaType === "document") {
    body.document = fileId;
  }

  else if (mediaType === "audio") {
    body.audio = fileId;
  }

  else if (mediaType === "video_note") {
    body.video_note = fileId;
  }

  // Rasm/video/fayl/audio uchun caption
  if (
    caption &&
    mediaType !== "voice" &&
    mediaType !== "video_note"
  ) {
    body.caption = caption;
  }

  return await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(body)
    }
  );
}


// ==========================================
// TELEFON RAQAMINI SO'RASH
// ==========================================

async function sendPhoneRequest(
  token,
  chatId
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
