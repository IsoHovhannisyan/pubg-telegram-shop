const express = require('express');
const userOrdersRouter = express.Router();
const db = require('../../bot/db/connect');

userOrdersRouter.get('/user/:tgUserId', async (req, res) => {
  const { tgUserId } = req.params;
  try {
    const result = await db.query('SELECT * FROM orders WHERE user_id = $1 AND status != $2 ORDER BY time DESC', [tgUserId, 'unpaid']);
    res.json(result.rows);
  } catch (err) {
    console.error('User orders error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

userOrdersRouter.post('/fallback', async (req, res) => {
  const { tgUserId, nickname, products } = req.body;
  try {
    await db.query(
      'INSERT INTO orders(tg_user_id, nickname, products, status, type) VALUES($1, $2, $3, $4, $5)',
      [tgUserId, nickname, JSON.stringify(products), 'manual_processing', 'manual']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Fallback order error:', err.message);
    res.status(500).json({ error: 'Failed to submit fallback order' });
  }
});

module.exports = userOrdersRouter;