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
  const { telegram_id, username, first_name, last_name, language } = req.body;

  try {
    await db.query(
      `INSERT INTO users (telegram_id, username, first_name, last_name, language)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (telegram_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         language = EXCLUDED.language`,
      [telegram_id, username, first_name, last_name, language]
    );
    res.status(201).json({ message: 'User created or updated' });
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

// GET /admin/users/:telegram_id/language → get language for a user (protected)
router.get('/admin/users/:telegram_id/language', verifyToken, async (req, res) => {
  const { telegram_id } = req.params;
  try {
    const result = await db.query('SELECT language FROM users WHERE telegram_id = $1', [telegram_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ language: result.rows[0].language });
  } catch (err) {
    console.error('❌ Error fetching user language:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
