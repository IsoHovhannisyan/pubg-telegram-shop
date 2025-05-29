const express = require('express');
const statsRouter = express.Router();
const db = require('../../bot/db/connect');
const verifyToken = require('../routes/verifyToken');

// Get period-based statistics
statsRouter.get('/period', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Get total revenue for the period
    const revenueResult = await db.query(`
      SELECT
        SUM((item->>'price')::int * (item->>'qty')::int) AS revenue,
        COUNT(DISTINCT orders.id) as total_orders
      FROM orders,
      LATERAL jsonb_array_elements(products) AS item
      WHERE status = 'delivered'
      AND time >= $1
      AND time <= $2
    `, [startDate, endDate]);

    // Get monthly breakdown
    const monthlyResult = await db.query(`
      SELECT
        DATE_TRUNC('month', time) as month,
        SUM((item->>'price')::int * (item->>'qty')::int) AS revenue,
        COUNT(DISTINCT orders.id) as total_orders
      FROM orders,
      LATERAL jsonb_array_elements(products) AS item
      WHERE status = 'delivered'
      AND time >= $1
      AND time <= $2
      GROUP BY DATE_TRUNC('month', time)
      ORDER BY month DESC
    `, [startDate, endDate]);

    // Get category breakdown for the period
    const categoryResult = await db.query(`
      SELECT
        item->>'category' AS category,
        COUNT(*) AS total,
        SUM((item->>'price')::int * (item->>'qty')::int) AS revenue
      FROM orders,
      LATERAL jsonb_array_elements(products) AS item
      WHERE status = 'delivered'
      AND time >= $1
      AND time <= $2
      GROUP BY item->>'category'
    `, [startDate, endDate]);

    res.json({
      period: {
        total_revenue: parseInt(revenueResult.rows[0].revenue) || 0,
        total_orders: parseInt(revenueResult.rows[0].total_orders) || 0
      },
      monthly: monthlyResult.rows.map(row => ({
        month: row.month,
        revenue: parseInt(row.revenue) || 0,
        total_orders: parseInt(row.total_orders) || 0
      })),
      categories: categoryResult.rows.map(row => ({
        category: row.category,
        total: parseInt(row.total) || 0,
        revenue: parseInt(row.revenue) || 0
      }))
    });
  } catch (err) {
    console.error('Period stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch period stats' });
  }
});

// Get category statistics
statsRouter.get('/category', verifyToken, async (req, res) => {
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