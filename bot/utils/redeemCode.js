const axios = require('axios');
require('dotenv').config();

const API_URL = 'https://synet.syntex-dev.ru/redeemDb';
const API_TOKEN = process.env.CHARACTER_API_TOKEN;

/**
 * Redeem activation code for a specific PUBG ID and UC package.
 * @param {string} playerId - The PUBG ID.
 * @param {string} productId - The internal product ID (e.g. uc_1920).
 * @returns {Promise<{ success: boolean, code?: string, message?: string }>}
 */
async function redeemCode(playerId, productId) {
  try {
    const response = await axios.post(
      API_URL,
      {
        playerId: playerId.toString(),
        productId
      },
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data;
    if (data && data.code) {
      return { success: true, code: data.code };
    }

    return { success: false, message: data.message || 'Code not returned' };
  } catch (error) {
    console.error('🔴 redeemCode error:', error.response?.data || error.message);
    return { success: false, message: 'Redeem request failed' };
  }
}

module.exports = redeemCode;
