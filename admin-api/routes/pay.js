const express = require('express');
const router = express.Router();

// Redirect endpoint: /pay/:orderId or /payment/:orderId
router.get(['/pay/:orderId', '/payment/:orderId'], async (req, res) => {
  const { orderId } = req.params;
  const amount = req.query.amount;
  
  // Redirect to our custom payment page
  res.redirect(`/payment/${orderId}?amount=${amount}`);
});

module.exports = router; 