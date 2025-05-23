// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../../bot/db/connect');
const verifyToken = require('./verifyToken');

// Получить все заказы с фильтрацией
router.get('/', verifyToken, async (req, res) => {
  const { 
    status, 
    startDate, 
    endDate, 
    page = 1,
    limit = 20
  } = req.query;

  try {
    let query = `
      SELECT o.*, u.username
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.telegram_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (startDate) {
      query += ` AND o.time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND o.time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    // Добавить пагинацию
    const offset = (page - 1) * limit;
    query += ` ORDER BY o.time DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Ошибка получения заказов:', err.message);
    res.status(500).json({ error: 'Не удалось получить заказы' });
  }
});

// Получить детали заказа
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(`
      SELECT o.*, u.username
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.telegram_id
      WHERE o.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Ошибка получения деталей заказа:', err.message);
    res.status(500).json({ error: 'Не удалось получить детали заказа' });
  }
});

// Обновить статус заказа
router.patch('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status, nickname } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Требуется указать статус' });
  }

  try {
    // Only update status and nickname (if provided)
    let query, params;
    if (nickname !== undefined) {
      query = 'UPDATE orders SET status = $1, nickname = $2 WHERE id = $3 RETURNING *';
      params = [status, nickname, id];
    } else {
      query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
      params = [status, id];
    }
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Ошибка обновления статуса:', err.message);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Получить статистику заказов
router.get('/stats/summary', verifyToken, async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    let query = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
      FROM orders
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Ошибка получения статистики:', err.message);
    res.status(500).json({ error: 'Не удалось получить статистику' });
  }
});

module.exports = router;
