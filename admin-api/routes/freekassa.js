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
router.post('/callback', async (req, res) => {
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

  const MERCHANT_ORDER_ID = body.MERCHANT_ORDER_ID;
  const AMOUNT = body.AMOUNT;
  const SIGN = body.SIGN;
  const SECRET_2 = process.env.FREEKASSA_SECRET_2;

  console.log('Parsed payment notification data:', { MERCHANT_ORDER_ID, AMOUNT, SIGN });

  if (!SECRET_2) {
    console.error('Missing FREEKASSA_SECRET_2');
    return res.status(400).send('Payment verification failed: missing secret');
  }

  if (!MERCHANT_ORDER_ID || !AMOUNT || !SIGN) {
    console.error('Missing required fields:', { MERCHANT_ORDER_ID, AMOUNT, SIGN });
    return res.status(400).send('Payment verification failed: missing required fields');
  }

  // Signature check (see Freekassa docs for your version)
  const expectedSign = crypto
    .createHash('md5')
    .update(`${MERCHANT_ORDER_ID}:${AMOUNT}:${SECRET_2}`)
    .digest('hex');

  console.log('Signature check:', { received: SIGN, expected: expectedSign });

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
    res.setHeader('Content-Type', 'text/plain');
    return res.send('YES');
  } catch (err) {
    console.error('❌ Error processing Freekassa callback:', err.message);
    return res.status(500).send('Internal Server Error');
  }
});

// Freekassa payment link generator endpoint
router.post('/link', async (req, res) => {
  const { orderId, amount } = req.body;
  const merchantId = process.env.FREEKASSA_MERCHANT_ID;
  const secretWord1 = process.env.FREEKASSA_SECRET_1;

  if (!merchantId || !secretWord1) {
    return res.status(500).json({ error: 'Freekassa merchant credentials not set' });
  }
  if (!orderId || !amount) {
    return res.status(400).json({ error: 'Missing orderId or amount' });
  }

  // Signature format: m:oa:s:MERCHANT_ID:AMOUNT:SECRET_WORD_1:ORDER_ID
  const signString = `${merchantId}:${amount}:${secretWord1}:${orderId}`;
  console.log('Generating signature with string:', signString);
  const signature = crypto.createHash('md5').update(signString).digest('hex');
  console.log('Generated signature:', signature);
  
  const link = `https://pay.freekassa.ru/?m=${merchantId}&oa=${amount}&o=${orderId}&s=${signature}`;
  console.log('Generated payment link:', link);
  
  return res.json({ link });
});

module.exports = router; 