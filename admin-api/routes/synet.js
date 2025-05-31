const express = require('express');
const router = express.Router();
const axios = require('axios');

const BASE_URL = 'https://synet.syntex-dev.ru/';
const TOKEN = process.env.SYNET_API_TOKEN;

// Helper for SyNet API calls
const syNetRequest = (endpoint, data = {}, method = 'post') =>
  axios({
    url: BASE_URL + endpoint,
    method,
    headers: { Authorization: `Bearer ${TOKEN}` },
    data
  }).then(res => res.data).catch(err => ({
    error: err.response?.data?.error || err.message
  }));

// 1. Get PUBG nickname
router.post('/charac', async (req, res) => {
  const { playerId } = req.body;
  const result = await syNetRequest('charac', { playerId });
  res.json(result);
});

// 2. Redeem UC code
router.post('/redeemDb', async (req, res) => {
  const { codeType, playerId } = req.body;
  const result = await syNetRequest('redeemDb', { codeType, playerId });
  res.json(result);
});

// 3. Add code
router.post('/addCodeDb', async (req, res) => {
  const { codeType, code } = req.body;
  const result = await syNetRequest('addCodeDb', { codeType, code });
  res.json(result);
});

// 4. Delete code
router.post('/deleteCodeDb', async (req, res) => {
  const { codeType, code } = req.body;
  const result = await syNetRequest('deleteCodeDb', { codeType, code });
  res.json(result);
});

// 5. Get code history
router.post('/history', async (req, res) => {
  const { code } = req.body;
  const result = await syNetRequest('history', { code });
  res.json(result);
});

// 6. Get detailed code history
router.post('/gethistoryCode', async (req, res) => {
  const { code } = req.body;
  const result = await syNetRequest('gethistoryCode', { code });
  res.json(result);
});

// 7. Get token activations
router.get('/tokenactivations', async (req, res) => {
  const result = await syNetRequest('tokenactivations', { token: TOKEN }, 'get');
  res.json(result);
});

module.exports = router; 