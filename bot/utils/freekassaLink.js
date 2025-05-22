const crypto = require('crypto');

function generateFreekassaLink(userId, amount) {
  const merchantId = process.env.FREEKASSA_MERCHANT_ID;
  const secretWord = process.env.FREEKASSA_SECRET_1;

  const str = `${merchantId}:${amount}:${secretWord}:${userId}`;
  const signature = crypto.createHash('md5').update(str).digest('hex');

  return `https://pay.freekassa.ru/?m=${merchantId}&oa=${amount}&o=${userId}&s=${signature}`;
}

module.exports = generateFreekassaLink;



