const axios = require('axios');
const NodeCache = require('node-cache');

// Cache nicknames for 1 hour to reduce API calls
const nicknameCache = new NodeCache({ stdTTL: 3600 });

async function verifyPubgId(pubgId, lang) {
  // Check if ID is valid format (only numbers, 5-20 digits)
  if (!/^\d{5,20}$/.test(pubgId)) {
    return {
      success: false,
      message: lang.cart.invalid_id
    };
  }

  // Check cache first
  const cachedNickname = nicknameCache.get(pubgId);
  if (cachedNickname) {
    return {
      success: true,
      nickname: cachedNickname
    };
  }

  try {
    const response = await axios({
      method: 'post',
      url: 'https://synet.syntex-dev.ru/charac',
      headers: {
        Authorization: `Bearer ${process.env.CHARACTER_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      data: { playerId: pubgId.toString() }
    });

    const data = response.data;
    if (data.nickname) {
      // Cache the nickname
      nicknameCache.set(pubgId, data.nickname);
      return {
        success: true,
        nickname: data.nickname
      };
    }
    return {
      success: false,
      message: lang.cart.not_found
    };
  } catch (error) {
    console.error('🔴 PUBG ID verification error:', error.message);
    console.log('🔎 Response:', error.response?.data || 'No response');
    
    // Handle specific error cases
    if (error.response?.status === 404) {
      return {
        success: false,
        message: lang.cart.not_found
      };
    }
    
    return {
      success: false,
      message: lang.cart.connection_failed
    };
  }
}

module.exports = verifyPubgId; 