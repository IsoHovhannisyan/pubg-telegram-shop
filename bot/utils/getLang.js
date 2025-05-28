// bot/utils/getLang.js
const axios = require('axios');
const API_URL = process.env.API_URL || 'http://localhost:3001';

async function getLang(ctx) {
  try {
    const res = await axios.get(`${API_URL}/users/${ctx.from.id}`);
    const langCode = res.data.language || 'ru';
    return require(`../../lang/${langCode}`);
  } catch (err) {
    if (!warned && ctx && ctx.reply) {
      warned = true;
      await ctx.reply('⚠️ Произошла временная ошибка сервера, поэтому язык переключён на русский.\n\n⚠️ Temporary server error, language switched to Russian.');
    }
    return require(`../../lang/ru`);
  }
}

module.exports = getLang;