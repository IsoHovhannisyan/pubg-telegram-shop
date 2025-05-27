const express = require('express');
const router = express.Router();
const db = require('../../bot/db/connect');

// New endpoint to get user language by telegram ID
router.get('/users/:telegramId/language', async (req, res) => {
  const { telegramId } = req.params;
  try {
    const result = await db.query('SELECT language FROM users WHERE telegram_id = $1', [telegramId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ language: result.rows[0].language });
  } catch (error) {
    console.error('Error fetching user language:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New endpoint to get products by category and status
router.get('/products/category/:category', async (req, res) => {
  const { category } = req.params;
  const { status = 'active' } = req.query;
  try {
    const result = await db.query('SELECT * FROM products WHERE category = $1 AND status = $2 ORDER BY price ASC', [category, status]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New endpoint to get a product by ID and status
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { status = 'active' } = req.query;
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1 AND status = $2', [id, status]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 