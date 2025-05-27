const crypto = require('crypto');

function generateFreekassaLink(orderId, amount) {
  // DEMO MODE: Use demo-pay link for visual confirmation
  if (process.env.DEMO_MODE === 'true') {
    // Change this URL if your Vercel deployment URL is different
    return `https://freekassa-vercel.vercel.app/api/demo-pay?orderId=${orderId}`;
  }

  // PRODUCTION: Use real Freekassa link
  const merchantId = process.env.FREEKASSA_MERCHANT_ID;
  const secretWord = process.env.FREEKASSA_SECRET_1;
  const str = `${merchantId}:${amount}:${secretWord}:${orderId}`;
  const signature = crypto.createHash('md5').update(str).digest('hex');
  return `https://pay.freekassa.ru/?m=${merchantId}&oa=${amount}&o=${orderId}&s=${signature}`;
}

module.exports = generateFreekassaLink;



