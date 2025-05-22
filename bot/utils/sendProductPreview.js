const bot = require('../instance');// պնդիր, որ `bot.js`-ը ճիշտ ուղու վրա է
const path = require('path');
const ADMIN_PREVIEW_CHAT_ID = process.env.ADMIN_PREVIEW_CHAT_ID || '<քո Telegram ID>';

module.exports = async function sendProductPreview(product) {
  try {
    const caption = `🛒 ${product.name}\n💸 ${product.price} ֏\n📦 Կատեգորիա: ${product.category}`;

    await bot.telegram.sendPhoto(
      ADMIN_PREVIEW_CHAT_ID,
      { source: path.join(__dirname, '..', '..', 'uploads', product.image) },
      { caption }
    );
  } catch (err) {
    console.error('❌ Failed to send product preview:', err.message);
  }
};
