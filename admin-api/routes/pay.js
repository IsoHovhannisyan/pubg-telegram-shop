const express = require('express');
const router = express.Router();
const axios = require('axios');

// Redirect endpoint: /pay/:orderId or /payment/:orderId
router.get(['/pay/:orderId', '/payment/:orderId'], async (req, res) => {
  const { orderId } = req.params;
  // Call the existing /freekassa/link endpoint to get the payment link
  try {
    // You may want to fetch the order amount from your DB, but for test mode, use a default/test amount
    const amount = req.query.amount || 100; // fallback for test, or fetch from DB
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const response = await axios.post(`${apiUrl}/freekassa/link`, { orderId, amount });
    const link = response.data.link;
    if (!link) return res.status(404).send('Payment link not found');
    return res.redirect(link);
  } catch (err) {
    return res.status(404).send('Order or payment link not found');
  }
});

module.exports = router; 