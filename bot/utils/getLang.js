// bot/utils/getLang.js
const axios = require('axios');
const API_URL = process.env.API_URL || 'http://localhost:3001';

async function getLang(ctx) {
  try {
    const res = await axios.get(`${API_URL}/users/${ctx.from.id}`);
    const langCode = res.data.language || 'ru';
    try {
      return require(`../../lang/${langCode}`);
    } catch (fileErr) {
      console.error(`❌ Language file for '${langCode}' not found, falling back to Russian.`);
      return require(`../../lang/ru`);
    }
  } catch (err) {
    console.error("❌ getLang API error:", err.message);
    return require(`../../lang/ru`);
  }
}

module.exports = getLang;