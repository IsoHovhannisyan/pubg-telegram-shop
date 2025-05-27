const axios = require('axios');

const SYNET_API_URL = 'https://synet.syntex-dev.ru';
const SYNET_TOKEN = process.env.CHARACTER_API_TOKEN;

const synetApi = axios.create({
  baseURL: SYNET_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SYNET_TOKEN}`
  }
});

async function redeemCode(playerId, codeType) {
  // DEMO MODE: Always return a mock successful response
  if (process.env.DEMO_MODE === 'true') {
    console.log('✅ SyNet API mock response used (in demo mode) for playerId:', playerId, 'codeType:', codeType);
    return {
      success: true,
      data: {
        success: true,
        warning: false,
        took: 123,
        playerId: playerId,
        code: 'MOCK-UC-123',
        openid: 'mock_openid',
        name: 'DemoPlayer',
        region: 'EU',
        productName: codeType || '60uc',
        amount: 60,
        uid: 'mock_uid',
        email: 'demo@example.com',
        password: 'mockpassword'
      }
    };
  }

  try {
    const response = await synetApi.post('/redeemDb', {
      codeType,
      playerId
    });

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ SyNet API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

module.exports = {
  redeemCode
}; 