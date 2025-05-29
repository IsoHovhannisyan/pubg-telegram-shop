const { Markup } = require('telegraf');
const userSelections = require('../utils/userSelections');
const axios = require('axios');
const db = require('../db/connect');
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
      try {
        // Register direct referral (level 1)
        await axios.post(
          `${API_URL}/admin/referrals`,
          { user_id: userId, referred_by: referredBy, level: 1 },
          { headers: { Authorization: `Bearer ${API_TOKEN}` } }
        );
        // Multi-level: check if referrer was also referred by someone (level 2) via API
        let grandRef = null;
        try {
          const refRes = await axios.get(
            `${API_URL}/admin/referrals/user/${referredBy}`,
            { headers: { Authorization: `Bearer ${API_TOKEN}` } }
          );
          if (refRes.data && refRes.data.referred_by && refRes.data.referred_by !== String(userId)) {
            grandRef = refRes.data.referred_by;
          }
        } catch {}
        if (grandRef) {
          await axios.post(
            `${API_URL}/admin/referrals`,
            { user_id: userId, referred_by: grandRef, level: 2 },
            { headers: { Authorization: `Bearer ${API_TOKEN}` } }
          );
        }
        // Notify the direct referrer (get language via API)
        let refLang = 'ru';
        try {
          const langRes = await axios.get(
            `${API_URL}/admin/users/${referredBy}/language`,
            { headers: { Authorization: `Bearer ${API_TOKEN}` } }
          );
          if (langRes.data && langRes.data.language) {
            refLang = langRes.data.language;
          }
        } catch {}
        let refMsg;
        try {
          refMsg = require(`../../lang/${refLang}`).referral.new_referral;
        } catch {
          refMsg = require('../../lang/ru').referral.new_referral;
        }
        try {
          await ctx.telegram.sendMessage(referredBy, refMsg);
        } catch (err) {
          console.error('❌ Не удалось отправить уведомление рефереру:', err.message);
        }
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









  