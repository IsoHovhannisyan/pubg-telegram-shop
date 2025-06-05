const express = require('express');
const router = express.Router();
const axios = require('axios');

// Redirect endpoint: /pay/:orderId
router.get('/pay/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const amount = req.query.amount;
  
  // Call the existing /freekassa/link endpoint to get the payment link
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const response = await axios.post(`${apiUrl}/freekassa/link`, { orderId, amount });
    const link = response.data.link;
    if (!link) return res.status(404).send('Payment link not found');
    return res.redirect(link);
  } catch (err) {
    return res.status(404).send('Order or payment link not found');
  }
});

// Payment endpoint: /payment/:orderId
router.get('/payment/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const amount = req.query.amount;
  
  // Return the payment page HTML
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <div id="root"></div>
        <script>
          window.location.href = 'https://pubg-telegram-shop.vercel.app/payment/${orderId}?amount=${amount}';
        </script>
      </body>
    </html>
  `);
});

module.exports = router; 