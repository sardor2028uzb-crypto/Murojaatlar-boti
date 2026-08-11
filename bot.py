import os
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters
)

TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = os.getenv("ADMIN_ID")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Assalomu alaykum!\n\n"
        "Bu murojaatlar boti.\n"
        "Murojaatingizni shu yerga yozib yuboring."
    )


async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    message = update.message

    text = message.text or "Foydalanuvchi fayl yoki media yubordi."

    admin_text = (
        "📩 YANGI MUROJAAT\n\n"
        f"👤 Foydalanuvchi: {user.full_name}\n"
        f"🆔 Telegram ID: {user.id}\n"
        f"🔗 Username: @{user.username if user.username else 'mavjud emas'}\n\n"
        f"📝 Murojaat:\n{text}"
    )

    if ADMIN_ID:
        try:
            await context.bot.send_message(
                chat_id=int(ADMIN_ID),
                text=admin_text
            )
        except Exception as e:
            print("Admin'ga yuborishda xato:", e)

    await message.reply_text(
        "✅ Murojaatingiz qabul qilindi.\n\n"
        "Murojaatingiz mas'ul xodimga yuborildi."
    )


def main():
    if not TOKEN:
        raise ValueError("BOT_TOKEN topilmadi!")

    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(
        MessageHandler(
            filters.TEXT & ~filters.COMMAND,
            message_handler
        )
    )

    print("Bot ishga tushdi...")
    app.run_polling()


if __name__ == "__main__":
    main()
