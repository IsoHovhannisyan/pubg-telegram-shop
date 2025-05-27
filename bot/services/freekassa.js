const db = require('../../bot/db/connect');
const bot = require('../../bot/bot').bot;
const crypto = require('crypto');
const { redeemCode } = require('./synet');

const FREESIGN_SECRET = process.env.FREEKASSA_SECRET; // թող այդտեղ լինի ֆայլում

const handleFreekassaCallback = async (req, res) => {
  const {
    MERCHANT_ID,
    AMOUNT,
    MERCHANT_ORDER_ID, // order ID
    SIGN
  } = req.query;

  // ✅ Ստեղծում ենք այնպիսի ստուգման hash, ինչպիսին docs-ում նշված է
  const hashString = `${MERCHANT_ID}:${AMOUNT}:${FREESIGN_SECRET}:${MERCHANT_ORDER_ID}`;
  const expectedSign = crypto.createHash('md5').update(hashString).digest('hex');

  if (expectedSign !== SIGN) {
    console.warn('❌ Invalid sign from Freekassa!');
    return res.status(403).send('Invalid sign');
  }

  try {
    const result = await db.query('SELECT * FROM orders WHERE id = $1', [MERCHANT_ORDER_ID]);
    const order = result.rows[0];

    if (!order) {
      console.warn(`❌ Order ${MERCHANT_ORDER_ID} not found`);
      return res.status(404).send('Order not found');
    }

    if (order.status === 'confirmed') {
      return res.send('Already confirmed');
    }

    // Parse products
    let products;
    try {
      products = Array.isArray(order.products) ? order.products : JSON.parse(order.products);
    } catch (e) {
      console.error('❌ Error parsing order.products:', e.message);
      return res.status(500).send('Order data error');
    }

    // Update order status to pending
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['pending', MERCHANT_ORDER_ID]);

    // Process each product
    const results = [];
    for (const product of products) {
      if (product.category === 'uc_by_id') {
        try {
          // Redeem code through SyNet API
          const redemption = await redeemCode(order.pubg_id, product.codeType || 'UC');
          
          if (redemption.success) {
            results.push({
              product: product.name,
              status: 'success',
              data: redemption.data
            });
          } else {
            results.push({
              product: product.name,
              status: 'error',
              error: redemption.error
            });
          }
        } catch (err) {
          console.error(`❌ Error redeeming code for product ${product.name}:`, err);
          results.push({
            product: product.name,
            status: 'error',
            error: err.message
          });
        }
      }
    }

    // Prepare notification message
    const userId = order.user_id;
    const pubgId = order.pubg_id;
    const itemsText = products.map(p =>
      `📦 ${p.name} x${p.qty} — ${p.price * p.qty} ₽`
    ).join('\n');

    // Add redemption results to message
    const redemptionResults = results
      .map(r => `${r.status === 'success' ? '✅' : '❌'} ${r.product}: ${r.status === 'success' ? 'Активирован' : r.error}`)
      .join('\n');

    await bot.telegram.sendMessage(userId, `
🧾 Заказ подтверждён:

🎮 PUBG ID: ${pubgId}
${itemsText}

💰 Сумма: ${AMOUNT} ₽
✅ Оплата получена.

Результаты активации:
${redemptionResults}
    `);

    // Update order status based on results
    const hasErrors = results.some(r => r.status === 'error');
    const newStatus = hasErrors ? 'error' : 'delivered';
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [newStatus, MERCHANT_ORDER_ID]);

    return res.send('YES');
  } catch (err) {
    console.error('❌ Error in Freekassa callback:', err.message);
    return res.status(500).send('Internal Server Error');
  }
};

module.exports = handleFreekassaCallback;





