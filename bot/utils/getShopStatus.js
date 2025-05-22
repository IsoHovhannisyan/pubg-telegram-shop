const axios = require("axios");

let cachedStatus = null;
let lastFetchTime = 0;

const getShopStatus = async () => {
  const now = Date.now();
  if (cachedStatus && now - lastFetchTime < 10000) return cachedStatus; // cache 10 վայրկյան

  try {
    const res = await axios.get("http://localhost:3001/admin/settings/shop-status", {
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_SECRET}` // հատուկ նախապես հայտնի token, որ օգտագործի միայն բոտը
      }
    });

    cachedStatus = res.data;
    lastFetchTime = now;
    return cachedStatus;
  } catch (err) {
    console.error("⚠️ Не удалось получить статус магазина:", err.message);
    return {
      shop_open: true,
      orders_enabled: true,
      shop_closed_message: "🛠 Магазин временно недоступен.",
      orders_disabled_message: "❗️Извините, в данный момент заказы недоступны."
    };
  }
};

module.exports = getShopStatus;
