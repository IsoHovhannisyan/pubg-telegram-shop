// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../../bot/db/connect');

// 🔁 Թարմացնել պատվերի կարգավիճակը
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Status update error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
