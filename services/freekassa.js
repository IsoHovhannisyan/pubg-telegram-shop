// services/freekassa.js
require('dotenv').config();
const crypto = require('crypto');

const MERCHANT_ID = process.env.FK_MERCHANT_ID;
const FK_SECRET = process.env.FEEKASSA_SECRET;
const FK_API_URL = 'https://pay.freekassa.ru/';

// ✅ Վճարման հղում գեներացնել
function generatePaymentLink({ order_id, amount, currency = 'RUB', description = 'Пополнение PUBG UC' }) {
  const sign = crypto.createHash('md5').update(`${MERCHANT_ID}:${amount}:${FK_SECRET}:${currency}:${order_id}`).digest('hex');

  const link = `${FK_API_URL}?m=${MERCHANT_ID}&oa=${amount}&o=${order_id}&currency=${currency}&s=${sign}&us_desc=${encodeURIComponent(description)}`;
  return link;
}

module.exports = { generatePaymentLink };
