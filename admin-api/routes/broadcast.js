const express = require('express');
const router = express.Router();
const verifyToken = require('./verifyToken');
const db = require('../../bot/db/connect');
const axios = require('axios');

const BOT_HTTP_URL = process.env.BOT_HTTP_URL || 'http://localhost:4000/send-message';
const BOT_API_SECRET = process.env.BOT_API_SECRET;

// POST /admin/broadcast
router.post('/broadcast', verifyToken, async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    // Get all user telegram IDs
    const result = await db.query('SELECT telegram_id FROM users');
    const userIds = result.rows.map(row => row.telegram_id);
    let sent = 0, failed = 0;
    for (const userId of userIds) {
      try {
        await axios.post(BOT_HTTP_URL, {
          userId,
          message,
          secret: BOT_API_SECRET,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💬 Оставить отзыв', url: 'https://t.me/Isohovhannisyan' }
              ]
            ]
          }
        });
        sent++;
      } catch (err) {
        failed++;
      }
    }
    res.json({ success: true, sent, failed });
  } catch (err) {
    console.error('❌ Ошибка рассылки:', err);
    res.status(500).json({ error: 'Ошибка рассылки' });
  }
});

module.exports = router; 