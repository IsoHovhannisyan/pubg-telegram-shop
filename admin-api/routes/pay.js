const express = require('express');
const router = express.Router();
const path = require('path');
const axios = require('axios');

// Serve static files from the React app first
router.use(express.static(path.join(__dirname, '../../admin-panel/build')));

// Serve the React app for all routes
router.get('/:orderId', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin-panel/build/index.html'));
});

// API endpoint to get payment link
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