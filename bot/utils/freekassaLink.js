const axios = require('axios');

/**
 * Requests a Freekassa payment link from the admin API.
 * @param {string|number} orderId - The order ID
 * @param {number} amount - The payment amount
 * @returns {Promise<string>} - The payment link
 */
async function generateFreekassaLink(orderId, amount) {
  const API_URL = process.env.API_URL || 'http://localhost:3001';
  try {
    const res = await axios.post(`${API_URL}/freekassa/link`, { orderId, amount });
    return res.data.link;
  } catch (err) {
    console.error('Error requesting Freekassa link from API:', err.message);
    return 'Ошибка генерации ссылки оплаты';
  }
}

module.exports = generateFreekassaLink; 