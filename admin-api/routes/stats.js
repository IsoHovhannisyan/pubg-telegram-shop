const express = require('express');
const statsRouter = express.Router();

statsRouter.get('/category', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT item->>'category' AS category,
             SUM((item->>'price')::int * (item->>'qty')::int) AS revenue,
             COUNT(*) AS total_orders
      FROM orders,
      LATERAL jsonb_array_elements(products) AS item
      WHERE status = 'delivered'
      GROUP BY category
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Stats by category error:', err.message);
    res.status(500).json({ error: 'Failed to fetch category stats' });
  }
});

module.exports = statsRouter;