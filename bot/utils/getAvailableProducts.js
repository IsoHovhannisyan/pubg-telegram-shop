// const axios = require('axios');

// const API_URL = 'https://synet.syntex-dev.ru/tokenactivations';
// const API_TOKEN = process.env.CHARACTER_API_TOKEN;

// async function getAvailableProducts() {
//   try {
//     const res = await axios.get(API_URL, {
//       headers: {
//         Authorization: `Bearer ${API_TOKEN}`
//       }
//     });

//     const data = res.data;
//     if (!data || typeof data !== 'object') {
//       console.warn('⚠️ Unexpected response format from tokenactivations');
//       return [];
//     }

//     return Object.entries(data)
//       .filter(([_, qty]) => qty > 0)
//       .map(([productId]) => productId);
//   } catch (err) {
//     console.error('🔴 getAvailableProducts error:', err.message);
//     return [];
//   }
// }

// module.exports = getAvailableProducts;
async function getAvailableProducts() {
  return []; // դատարկ array, բայց ՎԱՐԺԱԿԱՆ վարվելակերպ
}

module.exports = getAvailableProducts;

