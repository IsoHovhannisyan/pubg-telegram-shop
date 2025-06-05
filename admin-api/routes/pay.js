const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');

// Serve the payment page
router.get('/pay/:orderId', async (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin-panel/build/index.html'));
});

// API endpoint to get payment link (will be called by frontend)
router.post('/api/payment/link', async (req, res) => {
  const { orderId, amount } = req.body;
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const response = await axios.post(`${apiUrl}/freekassa/link`, { orderId, amount });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get payment link' });
  }
});

module.exports = router; 