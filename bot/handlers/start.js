const { Markup } = require('telegraf');
const userSelections = require('../utils/userSelections');
const db = require('../db/connect');

module.exports = async (ctx) => {
  const userId = ctx.from.id;
  userSelections.delete(userId);

  // Referral logic
  if (ctx.startPayload && ctx.startPayload.startsWith('ref_')) {
    const referredBy = ctx.startPayload.replace('ref_', '');
    if (referredBy && referredBy !== String(userId)) {
      // Check if referral already exists
      const exists = await db.query('SELECT 1 FROM referrals WHERE user_id = $1', [userId]);
      if (exists.rowCount === 0) {
        await db.query('INSERT INTO referrals (user_id, referred_by, level) VALUES ($1, $2, 1)', [userId, referredBy]);
        // Optionally notify the referrer here
      }
    }
  }

  // МЕНЮ не показываем, пока язык не выбран
  await ctx.reply(
    "🇷🇺 Выберите язык / 🇬🇧 Choose a language",
    Markup.inlineKeyboard([
      [Markup.button.callback("🇷🇺 Русский", "lang_ru")],
      [Markup.button.callback("🇬🇧 English", "lang_en")]
    ])
  );
};









  