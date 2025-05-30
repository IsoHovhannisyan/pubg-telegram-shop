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