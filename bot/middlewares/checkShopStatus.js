const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

let cachedStatus = null;
let lastFetch = 0;
const CACHE_DURATION = 10000; // 10 seconds

async function getShopStatus() {
  const now = Date.now();
  if (cachedStatus && now - lastFetch < CACHE_DURATION) {
    return cachedStatus;
  }

  try {
    const response = await axios.get(`${API_URL}/admin/settings/shop-status`, {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN}`
      }
    });
    
    cachedStatus = response.data;
    lastFetch = now;
    return cachedStatus;
  } catch (error) {
    console.error('Error fetching shop status:', error);
    // Return default status if API is unavailable
    return {
      shop_open: true,
      orders_enabled: true,
      shop_closed_message: "🛠 Магазин временно недоступен.",
      orders_disabled_message: "❗️Извините, в данный момент заказы недоступны."
    };
  }
}

module.exports = async function checkShopStatus(ctx, next) {
  // Skip check for admin commands
  if (ctx.message?.text?.startsWith('/admin')) {
    return next();
  }

  const status = await getShopStatus();

  // If shop is closed, send message and stop
  if (!status.shop_open) {
    // Use custom message if it exists, otherwise use default message
    const message = status.shop_closed_custom_message || status.shop_closed_message;
    return ctx.reply(message);
  }

  // If orders are disabled, check if the user is trying to make an order
  if (!status.orders_enabled) {
    // Check for order-related commands and actions
    const orderCommands = ['/order', 'confirm_order', 'open_uc_catalog', 'open_popularity_catalog', 'category:cars', 'category:xcostumes'];
    const isOrderAction = orderCommands.some(cmd => 
      ctx.message?.text?.startsWith(cmd) || 
      ctx.callbackQuery?.data === cmd
    );

    if (isOrderAction) {
      return ctx.reply(status.orders_disabled_message);
    }
  }

  // Continue if all checks pass
  return next();
}; 