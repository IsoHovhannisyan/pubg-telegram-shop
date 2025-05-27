const axios = require('axios');
const bot = require('../../bot/bot').bot;
const crypto = require('crypto');
const { redeemCode } = require('./synet');

const FREESIGN_SECRET = process.env.FREEKASSA_SECRET;
const API_URL = process.env.API_URL || 'http://localhost:3001';
const API_TOKEN = process.env.ADMIN_API_TOKEN;

const handleFreekassaCallback = async (req, res) => {
  const {
    MERCHANT_ID,
    AMOUNT,
    MERCHANT_ORDER_ID, // order ID
    SIGN
  } = req.query;

  const hashString = `${MERCHANT_ID}:${AMOUNT}:${FREESIGN_SECRET}:${MERCHANT_ORDER_ID}`;
  const expectedSign = crypto.createHash('md5').update(hashString).digest('hex');

  if (expectedSign !== SIGN) {
    console.warn('❌ Invalid sign from Freekassa!');
    return res.status(403).send('Invalid sign');
  }

  try {
    // Fetch order from API
    const orderRes = await axios.get(`${API_URL}/admin/orders/${MERCHANT_ORDER_ID}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    });
    const order = orderRes.data;

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

    // Update order status to pending via API
    await axios.patch(`${API_URL}/admin/orders/${MERCHANT_ORDER_ID}`,
      { status: 'pending' },
      { headers: { Authorization: `Bearer ${API_TOKEN}` } }
    );

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

    await bot.telegram.sendMessage(userId, `\n🧾 Заказ подтверждён:\n\n🎮 PUBG ID: ${pubgId}\n${itemsText}\n\n💰 Сумма: ${AMOUNT} ₽\n✅ Оплата получена.\n\nРезультаты активации:\n${redemptionResults}`);

    // Update order status based on results via API
    const hasErrors = results.some(r => r.status === 'error');
    const newStatus = hasErrors ? 'error' : 'delivered';
    await axios.patch(`${API_URL}/admin/orders/${MERCHANT_ORDER_ID}`,
      { status: newStatus },
      { headers: { Authorization: `Bearer ${API_TOKEN}` } }
    );

    return res.send('YES');
  } catch (err) {
    console.error('❌ Error in Freekassa callback:', err.message);
    return res.status(500).send('Internal Server Error');
  }
};

module.exports = handleFreekassaCallback;





