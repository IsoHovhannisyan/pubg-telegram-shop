// admin-api/utils/sendProductPreview.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();

const sendProductPreview = async (chatId, imageFilename, caption) => {
  const botToken = process.env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const imagePath = path.join(__dirname, '..', '..', 'uploads', imageFilename);

  try {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('photo', fs.createReadStream(imagePath));

    await axios.post(url, form, {
      headers: form.getHeaders(),
    });
  } catch (error) {
    console.error('❌ Telegram նկարի ուղարկման սխալ:', error.message);
  }
};

module.exports = sendProductPreview;
