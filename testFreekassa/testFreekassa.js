const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const SECRET_2 = 'LLoINi1&XoAmvG9'; // SECRET_WORD_2

app.post('/freekassa/callback', (req, res) => {
  console.log('📥 Ստացվեց տվյալ:', req.body);

  if (req.body.status_check === '1') {
    console.log('🔎 Freekassa ստուգում է callback-ը, ոչ վճարում է գալիս');
    return res.status(200).send('YES');
  }

  const { MERCHANT_ORDER_ID, AMOUNT, SIGN } = req.body;

  const expectedSign = crypto
    .createHash('md5')
    .update(`${MERCHANT_ORDER_ID}:${AMOUNT}:${SECRET_2}`)
    .digest('hex');

  if (SIGN !== expectedSign) {
    console.log('❌ Սխալ ստորագրություն!');
    return res.status(403).send('Invalid signature');
  }

  console.log('✅ Վճարումը հաստատված է:', MERCHANT_ORDER_ID, AMOUNT);
  res.send('YES');
});

app.get('/', (req, res) => {
  res.send('✅ Test Freekassa Callback Server is running.');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Test server running at http://localhost:${PORT}`);
});
