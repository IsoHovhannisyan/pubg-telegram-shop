const express = require('express');
const db = require('../../bot/db/connect');
const cartRouter = express.Router();

cartRouter.post('/add', async (req, res) => {
  const { tgUserId, productId, qty } = req.body;
  try {
    await db.query(
      'INSERT INTO cart(user_id, product_id, qty) VALUES($1, $2, $3) ON CONFLICT (user_id, product_id) DO UPDATE SET qty = cart.qty + $3',
      [tgUserId, productId, qty]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Add to cart error:', err.message);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

cartRouter.get('/:tgUserId', async (req, res) => {
  const { tgUserId } = req.params;
  try {
    const result = await db.query(
      `SELECT c.product_id, c.qty, p.name, p.price, p.category FROM cart c
       JOIN products p ON c.product_id = p.id WHERE c.user_id = $1`,
      [tgUserId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Cart fetch error:', err.message);
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

module.exports = cartRouter;