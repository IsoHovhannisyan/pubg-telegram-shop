const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MERCHANT_ID = '61515';
const API_KEY = '27a1b01bbb127c94a0a4dc63ee6a4374';

function generateApiSignature(params) {
    const { signature, ...paramsToSign } = params;
    const sortedParams = Object.keys(paramsToSign).sort().reduce((acc, key) => {
        acc[key] = paramsToSign[key];
        return acc;
    }, {});
    const signString = Object.values(sortedParams).join('|');
    return crypto.createHmac('sha256', API_KEY).update(signString).digest('hex');
}

app.post('/api/create-payment', async (req, res) => {
    const { amount } = req.body;
    const orderId = `test_${Date.now()}`;
    const params = {
        shopId: MERCHANT_ID,
        nonce: Date.now(),
        i: 42, // SBP
        amount,
        currency: 'RUB',
        paymentId: orderId,
        email: 'test@example.com',
        ip: '127.0.0.1'
    };
    params.signature = generateApiSignature(params);

    const response = await fetch('https://api.fk.life/v1/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    const data = await response.json();
    console.log('Freekassa API response:', data);

    if (!data.location) {
        // Return error to frontend
        return res.status(400).json({ error: data.message || 'Ошибка создания платежа', details: data });
    }

    res.json(data);
});

app.listen(3002, () => console.log('Custom SBP server started on http://localhost:3002')); 