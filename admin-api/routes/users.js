const express = require('express');
const router = express.Router();
const db = require('../../bot/db/connect');
const verifyToken = require('./verifyToken');

// ✅ GET /users/:telegram_id → ստանում է լեզուն
router.get('/:telegram_id', async (req, res) => {
  const { telegram_id } = req.params;

  try {
    const result = await db.query('SELECT language FROM users WHERE telegram_id = $1', [telegram_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ language: result.rows[0].language });
  } catch (err) {
    console.error('❌ User fetch error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ POST /users → ստեղծում է նոր user
router.post('/', async (req, res) => {
  const { telegram_id, language } = req.body;

  try {
    await db.query(
      'INSERT INTO users (telegram_id, language) VALUES ($1, $2) ON CONFLICT (telegram_id) DO NOTHING',
      [telegram_id, language]
    );
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error('❌ Error inserting user:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ GET /admin/users → get all users (for admin panel)
router.get('/admin/users', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT telegram_id, username, first_name, last_name, language, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching all users:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
