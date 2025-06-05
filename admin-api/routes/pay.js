const express = require('express');
const router = express.Router();

// Redirect endpoint: /pay/:orderId
router.get('/pay/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const amount = req.query.amount;
  
  // Redirect to the frontend payment page
  res.redirect(`https://pubg-telegram-shop.vercel.app/payment/${orderId}?amount=${amount}`);
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