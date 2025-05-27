// admin-api/utils/sendProductPreview.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();

const sendProductPreview = async (chatId, image, caption, isFile = false) => {
  const botToken = process.env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

  // Debug logs
  console.log('sendProductPreview debug:', {
    botToken: botToken ? botToken.slice(0, 10) + '...' : undefined,
    chatId,
    image,
    caption
  });

  if (isFile) {
    // Send as file (local path)
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('photo', fs.createReadStream(image));
    try {
      const resp = await axios.post(url, form, {
        headers: form.getHeaders(),
      });
      console.log('sendPhoto (file) response:', resp.data);
    } catch (error) {
      console.error('❌ Telegram file send error:', error.message, error.response?.data);
    }
  } else {
    // Send as URL
    try {
      const resp = await axios.post(url, {
        chat_id: chatId,
        caption,
        parse_mode: 'Markdown',
        photo: image
      });
      console.log('sendPhoto (url) response:', resp.data);
    } catch (error) {
      console.error('❌ Telegram image send error:', error.message, error.response?.data);
    }
  }
};

module.exports = sendProductPreview;
