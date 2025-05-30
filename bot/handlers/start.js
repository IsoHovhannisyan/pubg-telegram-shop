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
        language: 'ru' // Default to Russian until user selects a language
      },
      API_TOKEN ? { headers: { Authorization: `Bearer ${API_TOKEN}` } } : undefined
    );
  } catch (err) {
    console.error('❌ Error saving user:', err.message);
  }

  // Referral logic
  if (ctx.startPayload && ctx.startPayload.startsWith('ref_')) {
    const referredBy = ctx.startPayload.replace('ref_', '');
    if (referredBy && referredBy !== String(userId)) {
      try {
        // Check if user is already referred by this specific referrer
        let isExistingReferral = false;
        try {
          const existingRefRes = await axios.get(
            `${API_URL}/admin/referrals/user/${userId}`,
            { headers: { Authorization: `Bearer ${API_TOKEN}` } }
          );
          // If user has any referrers, they are already in the system
          isExistingReferral = existingRefRes.data && existingRefRes.data.length > 0;
        } catch (err) {
          // If error, assume user is not a referral
          isExistingReferral = false;
        }

        // Only proceed if user is not already referred
        if (!isExistingReferral) {
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
            // Find the level 1 referral for the referrer
            if (refRes.data && Array.isArray(refRes.data)) {
              const level1Ref = refRes.data.find(r => r.level === 1);
              if (level1Ref && level1Ref.referred_by && level1Ref.referred_by !== String(userId)) {
                grandRef = level1Ref.referred_by;
              }
            }
          } catch (err) {
            console.error('❌ Error checking grand referrer:', err.message);
          }

          if (grandRef) {
            await axios.post(
              `${API_URL}/admin/referrals`,
              { user_id: userId, referred_by: grandRef, level: 2 },
              { headers: { Authorization: `Bearer ${API_TOKEN}` } }
            );
          }

          // Notify the direct referrer (get language via API)
          let refLang = 'ru'; // Default to Russian
          try {
            // Get the referrer's language from the API
            const langRes = await axios.get(
              `${API_URL}/users/${referredBy}`,
              { headers: { Authorization: `Bearer ${API_TOKEN}` } }
            );
            if (langRes.data && langRes.data.language) {
              refLang = langRes.data.language;
            }
          } catch (err) {
            console.error('❌ Error getting referrer language:', err.message);
          }

          // Get the message in the referrer's language
          let refMsg;
          try {
            const lang = require(`../../lang/${refLang}`);
            refMsg = lang.referral.new_referral;
          } catch (err) {
            // Fallback to Russian if language file not found
            const lang = require(`../../lang/ru`);
            refMsg = lang.referral.new_referral;
          }

          // Send notification to referrer
          await ctx.telegram.sendMessage(referredBy, refMsg);
        }
      } catch (err) {
        console.error('❌ Error in referral registration:', err.message);
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









  