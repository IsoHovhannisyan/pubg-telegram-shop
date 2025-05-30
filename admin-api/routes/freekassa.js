const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { Pool } = require('pg');

// Set up your database connection (adjust as needed)
const pool = new Pool({
  connectionString: process.env.DB_URL || process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

// Freekassa callback endpoint
router.post('/freekassa/callback', async (req, res) => {
  // Freekassa sends form data, not JSON
  let body = req.body;
  if (typeof body === 'string') {
    body = Object.fromEntries(new URLSearchParams(body));
  }

  const { MERCHANT_ORDER_ID, AMOUNT, SIGN } = body;
  const SECRET_2 = process.env.FREEKASSA_SECRET_2;

  if (!SECRET_2) {
    return res.status(400).send('Payment verification failed: missing secret');
  }

  if (!MERCHANT_ORDER_ID || !AMOUNT || !SIGN) {
    return res.status(400).send('Payment verification failed: missing required fields');
  }

  // Signature check (see Freekassa docs for your version)
  const expectedSign = crypto
    .createHash('md5')
    .update(`${MERCHANT_ORDER_ID}:${AMOUNT}:${SECRET_2}`)
    .digest('hex');

  if (SIGN !== expectedSign) {
    return res.status(403).send('Payment verification failed: invalid signature');
  }

  try {
    // Get order from DB
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [MERCHANT_ORDER_ID]);
    const order = result.rows[0];
    if (!order) {
      return res.status(404).send('Order not found');
    }
    if (order.status === 'delivered' || order.status === 'error') {
      return res.send(`Order already ${order.status}`);
    }
    // Update order status
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['pending', MERCHANT_ORDER_ID]);
    // TODO: Add your product delivery/activation logic here if needed
    res.setHeader('Content-Type', 'text/plain');
    return res.send('YES');
  } catch (err) {
    console.error('❌ Error processing Freekassa callback:', err.message);
    return res.status(500).send('Internal Server Error');
  }
});

// Freekassa payment link generator endpoint
router.post('/freekassa/link', async (req, res) => {
  const { orderId, amount } = req.body;
  const merchantId = process.env.FREEKASSA_MERCHANT_ID;
  const secretWord1 = process.env.FREEKASSA_SECRET_1;

  if (!merchantId || !secretWord1) {
    return res.status(500).json({ error: 'Freekassa merchant credentials not set' });
  }
  if (!orderId || !amount) {
    return res.status(400).json({ error: 'Missing orderId or amount' });
  }

  // Signature: m:oa:s:MERCHANT_ID:AMOUNT:SECRET_WORD_1:ORDER_ID
  const signString = `${merchantId}:${amount}:${secretWord1}:${orderId}`;
  const signature = crypto.createHash('md5').update(signString).digest('hex');
  const link = `https://pay.freekassa.ru/?m=${merchantId}&oa=${amount}&o=${orderId}&s=${signature}`;
  return res.json({ link });
});

module.exports = router; 