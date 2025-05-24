// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../../bot/db/connect');
const verifyToken = require('./verifyToken');
const bot = require('../../bot/instance');

// Notify user about delivery - must be before parameterized routes
router.post('/notify-delivery', verifyToken, async (req, res) => {
  const { userId, orderId, pubgId, nickname } = req.body;

  try {
    const result = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = result.rows[0];

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const products = Array.isArray(order.products) 
      ? order.products 
      : JSON.parse(order.products || "[]");

    const itemsText = products.map(p => 
      `📦 ${p.name || p.title} x${p.qty} — ${p.price * p.qty} ₽`
    ).join('\n');

    const message = `
✅ <b>Ваш заказ доставлен!</b>

🎮 PUBG ID: <code>${pubgId}</code>
${nickname ? `👤 Никнейм: ${nickname}\n` : ''}

${itemsText}

💰 Сумма: ${order.total} ₽

Спасибо за покупку! 🎉
    `;

    try {
      await bot.telegram.sendMessage(userId, message, { parse_mode: 'HTML' });
      res.json({ success: true });
    } catch (botError) {
      // Handle specific Telegram bot errors
      if (botError.message.includes('chat not found') || 
          botError.message.includes('bot was blocked') ||
          botError.message.includes('user is deactivated')) {
        return res.status(400).json({ 
          error: 'chat not found',
          message: 'Пользователь заблокировал бота или не нажал Start'
        });
      }
      throw botError; // Re-throw other errors
    }
  } catch (err) {
    console.error('❌ Delivery notification error:', err.message);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

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
      SELECT id, user_id, pubg_id, products, status, time, nickname
      FROM orders
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

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

    // Добавить пагинацию
    const offset = (page - 1) * limit;
    query += ` ORDER BY time DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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
