const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { Pool } = require('pg');
const bot = require('../../bot/instance');
const db = require('../../bot/db/connect');

// Set up your database connection (adjust as needed)
const pool = new Pool({
  connectionString: process.env.DB_URL || process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

// Freekassa callback endpoint
router.post('/callback', async (req, res) => {
  // --- DEBUG LOG ---
  console.log('Received Freekassa callback headers:', req.headers);
  console.log('Received Freekassa callback body:', req.body);

  // Handle status check request
  if (req.body.status_check === '1') {
    console.log('Received status check request from Freekassa');
    return res.send('YES');
  }

  // Handle actual payment notification
  const body = req.body;
  if (!body) {
    console.error('No body received in callback');
    return res.status(400).send('No data received');
  }

  // Extract required fields
  const MERCHANT_ID = body.MERCHANT_ID;
  const AMOUNT = body.AMOUNT;
  const MERCHANT_ORDER_ID = body.MERCHANT_ORDER_ID;
  const SIGN = body.SIGN;
  const SECRET_2 = process.env.FREEKASSA_SECRET_2;

  // --- DEBUG LOG ---
  console.log('Parsed payment notification data:', { MERCHANT_ID, AMOUNT, MERCHANT_ORDER_ID, SIGN });

  if (!SECRET_2) {
    console.error('Missing FREEKASSA_SECRET_2');
    return res.status(400).send('Payment verification failed: missing secret');
  }
  if (!MERCHANT_ID || !AMOUNT || !MERCHANT_ORDER_ID || !SIGN) {
    console.error('Missing required fields:', { MERCHANT_ID, AMOUNT, MERCHANT_ORDER_ID, SIGN });
    return res.status(400).send('Payment verification failed: missing required fields');
  }

  // Signature check for callback (see docs)
  const expectedSign = crypto
    .createHash('md5')
    .update(`${MERCHANT_ID}:${AMOUNT}:${SECRET_2}:${MERCHANT_ORDER_ID}`)
    .digest('hex');
  // --- DEBUG LOG ---
  console.log('Expected callback signature:', expectedSign);

  if (SIGN !== expectedSign) {
    console.error('Invalid signature');
    return res.status(403).send('Payment verification failed: invalid signature');
  }

  try {
    // Get order from DB
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [MERCHANT_ORDER_ID]);
    const order = result.rows[0];
    if (!order) {
      console.error('Order not found:', MERCHANT_ORDER_ID);
      return res.status(404).send('Order not found');
    }
    if (order.status === 'delivered' || order.status === 'error') {
      console.log('Order already processed:', order.status);
      return res.send(`Order already ${order.status}`);
    }
    // Update order status
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['pending', MERCHANT_ORDER_ID]);
    console.log('Order status updated to pending:', MERCHANT_ORDER_ID);

    // Fetch order again to get user_id and products
    const refreshedResult = await pool.query('SELECT * FROM orders WHERE id = $1', [MERCHANT_ORDER_ID]);
    const refreshedOrder = refreshedResult.rows[0];
    const products = Array.isArray(refreshedOrder.products) ? refreshedOrder.products : JSON.parse(refreshedOrder.products || '[]');

    // 1. Notify manager (reuse notification logic from orders.js)
    let userInfo = null;
    try {
      const userRes = await db.query('SELECT username FROM users WHERE telegram_id = $1', [refreshedOrder.user_id]);
      userInfo = userRes.rows[0];
    } catch (e) { userInfo = null; }

    const itemsText = products.map(p => 
      `📦 ${p.name || p.title} x${p.qty} — ${p.price * p.qty} ₽`
    ).join('\n');

    const categories = [...new Set(products.map(p => p.category))];
    const categoryLabels = {
      'POPULARITY_ID': '🎯 Popular by ID',
      'POPULARITY_HOME': '🏠 Popular by Home',
      'CARS': '🚗 Cars',
      'COSTUMES': '👕 X-Costumes',
      'uc_by_id': '💎 UC by ID'
    };
    const productsByCategory = categories.map(category => {
      const categoryProducts = products.filter(p => p.category === category);
      const categoryTotal = categoryProducts.reduce((sum, p) => sum + (p.price * p.qty), 0);
      return {
        label: categoryLabels[category] || category,
        products: categoryProducts,
        total: categoryTotal
      };
    });
    const categorySection = productsByCategory.map(cat => 
      `\n📦 <b>${cat.label}</b>\n` +
      cat.products.map(p => `  • ${p.name || p.title} x${p.qty} — ${p.price * p.qty} ₽`).join('\n') +
      `\n  💰 Подкатегория: ${cat.total} ₽`
    ).join('\n');

    const managerMessage = `💰 <b>Новая оплата получена!</b>\n\n` +
      `ID заказа: <b>${refreshedOrder.id}</b>\n` +
      `🎮 PUBG ID: <code>${refreshedOrder.pubg_id}</code>\n` +
      `${refreshedOrder.nickname ? `👤 Никнейм: ${refreshedOrder.nickname}\n` : ''}` +
      `${userInfo ? `🆔 Telegram: <b>${refreshedOrder.user_id}</b> ${userInfo.username ? `(@${userInfo.username})` : ''}\n` : ''}` +
      `${categorySection}\n\n` +
      `💰 Общая сумма: ${products.reduce((sum, p) => sum + (p.price * p.qty), 0)} ₽\n` +
      `⚠️ Требуется активация!`;

    // Send to all managers
    let managerIds = [];
    if (process.env.MANAGER_CHAT_ID) managerIds.push(process.env.MANAGER_CHAT_ID);
    if (process.env.MANAGER_IDS) managerIds = managerIds.concat(process.env.MANAGER_IDS.split(','));
    managerIds = [...new Set(managerIds.filter(Boolean))];
    for (const managerId of managerIds) {
      try {
        await bot.telegram.sendMessage(managerId, managerMessage, { parse_mode: 'HTML' });
      } catch (err) {
        console.error(`❌ Failed to send notification to manager ${managerId}:`, err.message);
      }
    }

    // 2. Notify user
    if (refreshedOrder.user_id) {
      const userMessage = `💰 <b>Оплата получена!</b>\n\n` +
        `🎮 PUBG ID: <code>${refreshedOrder.pubg_id}</code>\n` +
        `${refreshedOrder.nickname ? `👤 Никнейм: ${refreshedOrder.nickname}\n` : ''}` +
        `${categorySection}\n\n` +
        `💰 Общая сумма: ${products.reduce((sum, p) => sum + (p.price * p.qty), 0)} ₽\n\n` +
        `⏳ Ваш заказ принят в обработку. Ожидайте автоматической активации!`;
      try {
        await bot.telegram.sendMessage(refreshedOrder.user_id, userMessage, { parse_mode: 'HTML' });
      } catch (err) {
        console.error(`❌ Failed to send status update to user ${refreshedOrder.user_id}:`, err.message);
      }
    }

    res.setHeader('Content-Type', 'text/plain');
    return res.send('YES');
  } catch (err) {
    console.error('❌ Error processing Freekassa callback:', err.message);
    return res.status(500).send('Internal Server Error');
  }
});

// Freekassa fail URL endpoint
router.get('/fail', async (req, res) => {
  const orderId = req.query.o;
  if (!orderId) return res.status(400).send('Order ID missing');
  try {
    // Do NOT update order status!
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = result.rows[0];
    if (order && order.user_id) {
      const managerUrl = 'https://t.me/YourManagerBot'; // Replace with your manager's site or bot
      const managerName = 'ManagerName'; // Replace with your manager's name or site
      const message = `❌ <b>Оплата не прошла</b>\n\n` +
        `Пожалуйста, попробуйте снова или свяжитесь с менеджером.\n\n` +
        `<a href=\"${managerUrl}\">Связаться с менеджером (${managerName})</a>`;
      try {
        await bot.telegram.sendMessage(order.user_id, message, { parse_mode: 'HTML', disable_web_page_preview: true });
      } catch (err) {
        console.error('❌ Failed to notify user about payment failure:', err.message);
      }
    }
    res.send('Оплата не прошла. Пожалуйста, попробуйте снова или обратитесь в поддержку.');
  } catch (err) {
    console.error('❌ Error processing Freekassa fail:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

// Freekassa payment link generator endpoint
router.post('/link', async (req, res) => {
  const { orderId, amount } = req.body;
  const merchantId = process.env.FREEKASSA_MERCHANT_ID;
  const secretWord1 = process.env.FREEKASSA_SECRET_1;
  const currency = 'RUB'; // Must match merchant settings

  if (!merchantId || !secretWord1) {
    console.error('Missing Freekassa credentials:', { 
      hasMerchantId: !!merchantId, 
      hasSecretWord: !!secretWord1 
    });
    return res.status(500).json({ error: 'Freekassa merchant credentials not set' });
  }
  if (!orderId || !amount) {
    console.error('Missing required parameters:', { orderId, amount });
    return res.status(400).json({ error: 'Missing orderId or amount' });
  }

  // Ensure amount is a number and has 2 decimal places
  const formattedAmount = Number(amount).toFixed(2);

  // Signature format: merchant_id:amount:secret_word_1:currency:order_id
  const signString = `${merchantId}:${formattedAmount}:${secretWord1}:${currency}:${orderId}`;
  // --- DEBUG LOG ---
  console.log('Signature string for payment link:', signString);
  const signature = crypto.createHash('md5').update(signString).digest('hex');
  // --- DEBUG LOG ---
  console.log('Generated signature for payment link:', signature);

  // Build payment link with properly encoded parameters
  const params = new URLSearchParams({
    m: merchantId,
    oa: formattedAmount,
    o: orderId,
    s: signature,
    currency: currency,
    test: '1' // Enable test mode
  });

  // Use the correct Freekassa payment URL (per docs)
  const link = `https://pay.fk.money/?${params.toString()}`;
  // --- DEBUG LOG ---
  console.log('Generated payment link:', link);

  return res.json({ link });
});

module.exports = router; 