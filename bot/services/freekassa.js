const db = require('../../bot/db/connect');
const bot = require('../../bot/bot').bot;
const crypto = require('crypto');

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

    await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['confirmed', MERCHANT_ORDER_ID]);

    const userId = order.user_id;
    const pubgId = order.pubg_id;
    const products = JSON.parse(order.products);

    const itemsText = products.map(p =>
      `📦 ${p.name} x${p.qty} — ${p.price * p.qty} ₽`
    ).join('\n');

    await bot.telegram.sendMessage(userId, `
🧾 Заказ подтверждён:

🎮 PUBG ID: ${pubgId}
${itemsText}

💰 Сумма: ${AMOUNT} ₽
✅ Оплата получена. Ваш заказ скоро будет выполнен.
    `);

    return res.send('YES');
  } catch (err) {
    console.error('❌ Error in Freekassa callback:', err.message);
    return res.status(500).send('Internal Server Error');
  }
};

module.exports = handleFreekassaCallback;





