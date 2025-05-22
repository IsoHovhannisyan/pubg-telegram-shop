const bot = require('../botInstance');
const { Markup } = require('telegraf');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function sendProductToTelegram(product, chatId) {
  const imageUrl = product.image?.startsWith('http')
    ? product.image
    : `${API_URL}/uploads/${product.image}`;

  const caption = `🛍 <b>${product.name}</b>\n💵 <b>${product.price}₽</b>\n🗂 Категория: ${product.category}`;

  try {
    await bot.telegram.sendPhoto(chatId, imageUrl, {
      caption,
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🛒 В корзину', `product_${product.id}`)],
      ])
    });
  } catch (err) {
    console.error("❌ Telegram send error:", err.message);
    throw err;
  }
}

module.exports = { sendProductToTelegram };
