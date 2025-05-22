const { Markup } = require('telegraf');
const db = require('../db/connect');
const userSelections = require('../utils/userSelections');
require('dotenv').config();
const getLang = require('../utils/getLang');

module.exports = async (ctx) => {
  const userId = ctx.from.id;
  const lang = await getLang(ctx);

  try {
    const result = await db.query(
      'SELECT pubg_id, products, status, time FROM orders WHERE user_id = $1 ORDER BY time ASC',
      [userId]
    );

    if (result.rows.length === 0) {
          return ctx.reply(
  `${lang.orders.no_orders}\n${lang.catalog.select_uc}`,
  Markup.inlineKeyboard([
    [Markup.button.callback('🛍 Магазин', 'open_shop_menu')]
  ])
);
    }

    // Group orders with same timestamp and pubg_id
    const groupedOrders = [];
    for (const row of result.rows) {
      const lastGroup = groupedOrders[groupedOrders.length - 1];
      const currentTime = new Date(row.time).getTime();
      const products = Array.isArray(row.products) ? row.products : JSON.parse(row.products);

      if (
        lastGroup &&
        lastGroup.pubg_id === row.pubg_id &&
        Math.abs(new Date(lastGroup.time).getTime() - currentTime) <= 1000
      ) {
        lastGroup.products.push(...products);
      } else {
        groupedOrders.push({
          pubg_id: row.pubg_id,
          products: [...products],
          status: row.status,
          time: row.time
        });
      }
    }

    let message = `${lang.orders.list} \n\n`;

    groupedOrders.forEach((order, idx) => {
      const productList = order.products.map(p => `• ${p.title || p.name} x${p.qty}`).join('\n');

      message += `🧾 ${lang.orders.order} #${idx + 1}\n` +
        `🎮 PUBG ID: ${order.pubg_id}\n` +
        `${productList}\n` +
        `📍 ${lang.orders.status}: ${order.status}\n` +
        `⏰ ${lang.orders.time}: ${new Date(order.time).toLocaleString('ru-RU')}\n\n`;
    });

    await ctx.reply(message);
  } catch (err) {
    console.error("❌ Ошибка при получении заказов:", err.message);
    await ctx.reply(lang.orders.error);
  }
};

module.exports.callbackQuery = async (ctx) => {
  const userId = ctx.from.id;
  const userData = userSelections.get(userId);
  const data = ctx.callbackQuery.data;
  const lang = await getLang(ctx);

  if (data === 'confirm_order') {
    if (!userData || (!userData.uc && !userData.popularity) || ((userData.uc || []).length === 0 && (userData.popularity || []).length === 0)) {
      return ctx.reply(lang.cart.select_first);
    }

    userData.expectingId = true;
    userSelections.set(userId, userData);

    return ctx.reply(lang.cart.enter_id);
  }

  if (data === 'cancel_order') {
    userSelections.delete(userId);

    await ctx.reply(
      `${lang.cart.cancelled}\n${lang.catalog.select_uc}`,
      Markup.inlineKeyboard([
        [
          [Markup.button.callback('🛍 Магазин', 'open_shop_menu')]

        ]
      ])
    );

    return ctx.answerCbQuery(lang.cart.cb_cancelled);
  }

  // ✅ Եթե այլ բան է սեղմել, բայց մեր կողմից սպասվող — ուղղորդիր ճիշտ տեղ
  if (data === 'open_catalog') {
    await ctx.answerCbQuery();
    return require('./catalogRedirect')(ctx);
  }

  if (data === 'open_popularity_catalog') {
    await ctx.answerCbQuery();
    return require('./popular')(ctx);
  }

  // ❌ Այլ անհասկանալի գործողության դեպքում՝
  return ctx.answerCbQuery(lang.unknown_action);
};













  

