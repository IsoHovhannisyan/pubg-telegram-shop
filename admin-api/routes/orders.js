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
            { text: '💬 Оставить отзыв', url: 'https://t.me/inv1s_shop' }
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

// Status mapping for Russian
const statusLabelsRu = {
  unpaid: 'Не оплачен',
  pending: 'В обработке',
  delivered: 'Доставлен',
  error: 'Ошибка',
  completed: 'Завершён',
  manual_processing: 'Требует ручной обработки',
};

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

    // Check if order contains manual processing items
    const needsManualProcessing = products.some(p => 
      p.type === 'manual' || 
      ['POPULARITY_ID', 'POPULARITY_HOME', 'CARS', 'COSTUMES'].includes(p.category)
    );

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
    // 1. Decrease stock when status changes from unpaid to any other status (except delivered)
    if (prevStatus === 'unpaid' && status !== 'unpaid' && status !== 'delivered') {
      for (const p of products) {
        await db.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [p.qty, p.id]
        );
        await db.query(
          `INSERT INTO stock_history (product_id, quantity, type, note)
           VALUES ($1, $2, $3, $4)`,
          [p.id, -p.qty, 'order', `Order #${id} status changed from unpaid to ${status}`]
        );
      }
    }
    // 2. Restore stock if moving to 'error' from any other status
    if (status === 'error' && prevStatus !== 'error') {
      for (const p of products) {
        await db.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [p.qty, p.id]
        );
        await db.query(
          `INSERT INTO stock_history (product_id, quantity, type, note)
           VALUES ($1, $2, $3, $4)`,
          [p.id, p.qty, 'order', `Order #${id} stock restored due to error status`]
        );
      }
    }
    // 3. Decrease stock again if moving from 'error' to any other status
    if (prevStatus === 'error' && status !== 'error') {
      for (const p of products) {
        await db.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [p.qty, p.id]
        );
        await db.query(
          `INSERT INTO stock_history (product_id, quantity, type, note)
           VALUES ($1, $2, $3, $4)`,
          [p.id, -p.qty, 'order', `Order #${id} stock decreased after error resolution`]
        );
      }
    }
    // --- END STOCK LOGIC ---

    // --- REFERRAL POINTS LOGIC ---
    // Award referral points if previous status is 'unpaid' and new status is NOT 'unpaid'
    if (prevStatus === 'unpaid' && status !== 'unpaid') {
      try {
        // Find direct (level 1) referrer
        const ref1Res = await db.query('SELECT referred_by FROM referrals WHERE user_id = $1 AND level = 1', [order.user_id]);
        if (ref1Res.rows.length > 0 && ref1Res.rows[0].referred_by) {
          const ref1 = ref1Res.rows[0].referred_by;
          const orderTotal = products.reduce((sum, p) => sum + (p.price * p.qty), 0);
          const points1 = Math.round(orderTotal * 0.03); // 3% for level 1
          await db.query('UPDATE users SET referral_points = COALESCE(referral_points,0) + $1 WHERE telegram_id = $2', [points1, ref1]);
        }
        // Find level 2 (grandparent) referrer
        const ref2Res = await db.query('SELECT referred_by FROM referrals WHERE user_id = $1 AND level = 2', [order.user_id]);
        if (ref2Res.rows.length > 0 && ref2Res.rows[0].referred_by) {
          const ref2 = ref2Res.rows[0].referred_by;
          const orderTotal = products.reduce((sum, p) => sum + (p.price * p.qty), 0);
          const points2 = Math.round(orderTotal * 0.01); // 1% for level 2
          await db.query('UPDATE users SET referral_points = COALESCE(referral_points,0) + $1 WHERE telegram_id = $2', [points2, ref2]);
        }
      } catch (err) {
        console.error('❌ Ошибка начисления реферальных баллов:', err.message);
      }
    }
    // --- END REFERRAL POINTS LOGIC ---

    // --- NOTIFICATION LOGIC ---
    // Notify managers on every status change
    let managerIds = [];
    if (process.env.MANAGER_CHAT_ID) managerIds.push(process.env.MANAGER_CHAT_ID);
    if (process.env.MANAGER_IDS) managerIds = managerIds.concat(process.env.MANAGER_IDS.split(','));
    managerIds = [...new Set(managerIds.filter(Boolean))]; // Remove duplicates and falsy

    // Fetch user info for username
    let userInfo = null;
    try {
      const userRes = await db.query('SELECT username FROM users WHERE telegram_id = $1', [order.user_id]);
      userInfo = userRes.rows[0];
    } catch (e) { userInfo = null; }

      const itemsText = products.map(p => 
        `📦 ${p.name || p.title} x${p.qty} — ${p.price * p.qty} ₽`
      ).join('\n');

    // Get unique categories and their labels
    const categories = [...new Set(products.map(p => p.category))];
    const categoryLabels = {
      'POPULARITY_ID': '🎯 Popular by ID',
      'POPULARITY_HOME': '🏠 Popular by Home',
      'CARS': '🚗 Cars',
      'COSTUMES': '👕 X-Costumes',
      'uc_by_id': '💎 UC by ID'
    };
    
    // Group products by category
    const productsByCategory = categories.map(category => {
      const categoryProducts = products.filter(p => p.category === category);
      const categoryTotal = categoryProducts.reduce((sum, p) => sum + (p.price * p.qty), 0);
      return {
        label: categoryLabels[category] || category,
        products: categoryProducts,
        total: categoryTotal
      };
    });

    // Build category section
    const categorySection = productsByCategory.map(cat => 
      `\n📦 <b>${cat.label}</b>\n` +
      cat.products.map(p => `  • ${p.name || p.title} x${p.qty} — ${p.price * p.qty} ₽`).join('\n')
    ).join('\n');

    // Build manager message based on status change
    let managerMessage = '';
    if (status === 'pending' && prevStatus === 'unpaid') {
      managerMessage = `💰 <b>Новая оплата получена!</b>\n\n` +
        `ID заказа: <b>${order.id}</b>\n` +
        `🎮 PUBG ID: <code>${order.pubg_id}</code>\n` +
        `${order.nickname ? `👤 Никнейм: ${order.nickname}\n` : ''}` +
        `${userInfo ? `🆔 Telegram: <b>${order.user_id}</b> ${userInfo.username ? `(@${userInfo.username})` : ''}\n` : ''}` +
        `${categorySection}\n\n` +
        `💰 Общая сумма: ${products.reduce((sum, p) => sum + (p.price * p.qty), 0)} ₽\n` +
        `⚠️ Требуется активация!`;
    } else if (status === 'error') {
      managerMessage = `❌ <b>Ошибка активации заказа!</b>\n\n` +
        `ID заказа: <b>${order.id}</b>\n` +
        `🎮 PUBG ID: <code>${order.pubg_id}</code>\n` +
        `${order.nickname ? `👤 Никнейм: ${order.nickname}\n` : ''}` +
        `${userInfo ? `🆔 Telegram: <b>${order.user_id}</b> ${userInfo.username ? `(@${userInfo.username})` : ''}\n` : ''}` +
        `${categorySection}\n\n` +
        `💰 Общая сумма: ${products.reduce((sum, p) => sum + (p.price * p.qty), 0)} ₽\n` +
        `⚠️ Требуется ручная проверка!`;
    } else {
      managerMessage = `🔔 <b>Статус заказа обновлён</b>\n\n` +
        `ID заказа: <b>${order.id}</b>\n` +
        `🎮 PUBG ID: <code>${order.pubg_id}</code>\n` +
        `${order.nickname ? `👤 Никнейм: ${order.nickname}\n` : ''}` +
        `${userInfo ? `🆔 Telegram: <b>${order.user_id}</b> ${userInfo.username ? `(@${userInfo.username})` : ''}\n` : ''}` +
        `${categorySection}\n\n` +
        `💰 Общая сумма: ${products.reduce((sum, p) => sum + (p.price * p.qty), 0)} ₽\n` +
        `📦 Новый статус: <b>${statusLabelsRu[status] || status}</b>`;
    }

      for (const managerId of managerIds) {
        try {
        await bot.telegram.sendMessage(managerId, managerMessage, { parse_mode: 'HTML' });
        } catch (err) {
          console.error(`❌ Failed to send notification to manager ${managerId}:`, err.message);
      }
    }

    // 2. Notify user about status change
    if (order.user_id) {
      let userMessage = '';
      if (status === 'delivered') {
        userMessage = `✅ <b>Ваш заказ доставлен!</b>\n\n` +
          `🎮 PUBG ID: <code>${order.pubg_id}</code>\n` +
          `${order.nickname ? `👤 Никнейм: ${order.nickname}\n` : ''}` +
          `${categorySection}\n\n` +
          `💰 Общая сумма: ${products.reduce((sum, p) => sum + (p.price * p.qty), 0)} ₽\n\n` +
          `Спасибо за покупку! 🎉\n\n` +
          `💬 Оставьте отзыв о нашем сервисе: @inv1s_shop`;
      } else if (status === 'error') {
        userMessage = `❌ <b>Произошла ошибка при обработке заказа</b>\n\n` +
          `🎮 PUBG ID: <code>${order.pubg_id}</code>\n` +
          `${order.nickname ? `👤 Никнейм: ${order.nickname}\n` : ''}` +
          `${categorySection}\n\n` +
          `💰 Общая сумма: ${products.reduce((sum, p) => sum + (p.price * p.qty), 0)} ₽\n\n` +
          `Наши менеджеры уже работают над решением проблемы.\n` +
          `Мы свяжемся с вами в ближайшее время.\n\n` +
          `📞 Поддержка: @inv1s_shop`;
      } else if (status === 'pending' && prevStatus === 'unpaid') {
        userMessage = `💰 <b>Оплата получена!</b>\n\n` +
          `🎮 PUBG ID: <code>${order.pubg_id}</code>\n` +
          `${order.nickname ? `👤 Никнейм: ${order.nickname}\n` : ''}` +
          `${categorySection}\n\n` +
          `💰 Общая сумма: ${products.reduce((sum, p) => sum + (p.price * p.qty), 0)} ₽\n\n` +
          `⏳ Ваш заказ принят в обработку.\n` +
          `Мы активируем его в ближайшее время!`;
      }

      if (userMessage) {
        try {
          await bot.telegram.sendMessage(order.user_id, userMessage, { parse_mode: 'HTML' });
        } catch (err) {
          console.error(`❌ Failed to send status update to user ${order.user_id}:`, err.message);
        }
      }
    }
    // --- END NOTIFICATION LOGIC ---

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
  const { user_id, pubg_id, products, time, nickname, checkout_id } = req.body;

  if (!user_id || !products || !time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.query(
      `INSERT INTO orders (user_id, pubg_id, products, status, time, nickname, checkout_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user_id,
        pubg_id || null,
        JSON.stringify(products),
        'unpaid', // Always set to unpaid on creation
        time,
        nickname || null,
        checkout_id || null
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Ошибка создания заказа:', err.message);
    res.status(500).json({ error: 'Не удалось создать заказ' });
  }
});

// Public order status endpoint for payment page
router.get('/public/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  try {
    const result = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];
    const products = Array.isArray(order.products)
      ? order.products
      : JSON.parse(order.products || '[]');
    const amount = products.reduce((sum, p) => sum + (p.price * p.qty), 0);
    return res.json({ id: order.id, status: order.status, amount });
  } catch (err) {
    console.error('❌ Ошибка получения статуса заказа:', err.message);
    res.status(500).json({ error: 'Не удалось получить статус заказа' });
  }
});

module.exports = router;
