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

    const total = products.reduce((sum, p) => sum + (p.price * p.qty), 0);

    const message = `\n✅ <b>Ваш заказ доставлен!</b>\n\n🎮 PUBG ID: <code>${pubgId}</code>\n${nickname ? `👤 Никнейм: ${nickname}\n` : ''}${itemsText}\n\n💰 Сумма: ${total} ₽\n\nСпасибо за покупку! 🎉`;

    const feedbackButton = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💬 Оставить отзыв', url: 'https://t.me/Isohovhannisyan' }
          ]
        ]
      },
      parse_mode: 'HTML'
    };

    try {
      await bot.telegram.sendMessage(userId, message, feedbackButton);
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
    // Get the current order to check previous status and products
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    const order = orderResult.rows[0];
    const prevStatus = order.status;
    const products = Array.isArray(order.products)
      ? order.products
      : JSON.parse(order.products || '[]');

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

    // --- STOCK RESERVATION/RESTORATION LOGIC ---
    // 1. Decrease stock ONLY when status changes to 'delivered'
    if (status === 'delivered' && prevStatus !== 'delivered') {
      for (const p of products) {
        await db.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [p.qty, p.id]
        );
        await db.query(
          `INSERT INTO stock_history (product_id, quantity, type, note)
           VALUES ($1, $2, $3, $4)`,
          [p.id, -p.qty, 'order', `Order #${id} delivered`]
        );
      }
    }
    // 2. Restore stock if moving to 'error' or 'canceled' from any other status
    if ((status === 'error' || status === 'canceled') && prevStatus !== 'error' && prevStatus !== 'canceled') {
      for (const p of products) {
        await db.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [p.qty, p.id]
        );
        await db.query(
          `INSERT INTO stock_history (product_id, quantity, type, note)
           VALUES ($1, $2, $3, $4)`,
          [p.id, p.qty, 'order', `Order #${id} restored (${status})`]
        );
      }
    }
    // --- END STOCK LOGIC ---

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Ошибка обновления статуса заказа:', err.message);
    res.status(500).json({ error: 'Не удалось обновить статус заказа' });
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

// Create a new order (for bot and admin panel)
router.post('/', verifyToken, async (req, res) => {
  const { user_id, pubg_id, products, status, time, nickname } = req.body;

  if (!user_id || !products || !status || !time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.query(
      `INSERT INTO orders (user_id, pubg_id, products, status, time, nickname)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        user_id,
        pubg_id || null,
        JSON.stringify(products),
        status,
        time,
        nickname || null
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Ошибка создания заказа:', err.message);
    res.status(500).json({ error: 'Не удалось создать заказ' });
  }
});

module.exports = router;
