const { Markup } = require('telegraf');
const userSelections = require('../utils/userSelections');
const axios = require('axios');
require('dotenv').config();

module.exports = async (ctx) => {
  const userId = ctx.from.id;
  userSelections.delete(userId);

  // Save user info to API
  const API_URL = process.env.API_URL || 'http://localhost:3001';
  const API_TOKEN = process.env.ADMIN_API_TOKEN;
  try {
    await axios.post(
      `${API_URL}/users`,
      {
        telegram_id: ctx.from.id,
        username: ctx.from.username || null,
        first_name: ctx.from.first_name || null,
        last_name: ctx.from.last_name || null,
        language: 'ru' // Default, will be updated on language selection
      },
      API_TOKEN ? { headers: { Authorization: `Bearer ${API_TOKEN}` } } : undefined
    );
  } catch (err) {
    console.error('❌ Ошибка при сохранении пользователя:', err.message);
  }

  // Referral logic
  if (ctx.startPayload && ctx.startPayload.startsWith('ref_')) {
    const referredBy = ctx.startPayload.replace('ref_', '');
    if (referredBy && referredBy !== String(userId)) {
      const API_URL = process.env.API_URL || 'http://localhost:3001';
      const API_TOKEN = process.env.ADMIN_API_TOKEN;
      try {
        await axios.post(
          `${API_URL}/admin/referrals`,
          { user_id: userId, referred_by: referredBy, level: 1 },
          { headers: { Authorization: `Bearer ${API_TOKEN}` } }
        );
        // Optionally notify the referrer here
      } catch (err) {
        console.error('❌ Ошибка при регистрации реферала:', err.message);
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









  