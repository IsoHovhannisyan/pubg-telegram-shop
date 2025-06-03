// ===============================
// ✅ cart.js (վերջնական ուղղված տարբերակ՝ SHOP redirect + սինթաքս ֆիքսեր)
// ===============================

const { Markup } = require('telegraf');
const userSelections = require('../utils/userSelections');
const axios = require('axios');
const https = require('https');
const getAvailableProducts = require('../utils/getAvailableProducts');
const getLang = require('../utils/getLang');
const verifyPubgId = require('../utils/pubgVerification');
const registerOrder = require('./orderHandler');
require('dotenv').config();

// Create a custom HTTPS agent with proper SSL configuration
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production'
});

async function getPubgNickname(pubgId) {
  try {
    const response = await axios({
      method: 'post',
      url: (process.env.API_URL || 'http://localhost:3001') + '/syNet/charac',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      data: { playerId: pubgId.toString() },
      httpsAgent // Use the custom HTTPS agent if needed
    });

    const data = response.data;
    if (data.nickname) {
      return { success: true, nickname: data.nickname };
    }
    return { success: false, message: 'Nickname not found' };
  } catch (error) {
    console.error('🔴 getPubgNickname error:', error.message);
    console.log('🔎 Response:', error.response?.data || 'No response');
    return { success: false, message: 'Connection failed or invalid ID' };
  }
}

async function showCart(ctx) {
  const lang = await getLang(ctx);
  const userId = ctx.from.id;
  const userData = userSelections.get(userId);

  const emptyReply = () => ctx.reply(
    lang.cart.empty,
    Markup.inlineKeyboard([
      [Markup.button.callback('🛍 Магазин', 'open_shop_menu')]
    ])
  );

  if (!userData) return emptyReply();

  userData.uc = (userData.uc || []).filter(item => item && item.id && item.title && typeof item.price === 'number');
  userData.popularity = (userData.popularity || []).filter(item => item && item.id && item.title && typeof item.price === 'number');
  userData.cars = (userData.cars || []).filter(item => item && item.id && item.title && typeof item.price === 'number');
  userData.costumes = (userData.costumes || []).filter(item => item && item.id && item.title && typeof item.price === 'number');
  userSelections.set(userId, userData);

  const ucItemsRaw = userData.uc;
  const groupedUC = {};
  for (const item of ucItemsRaw) {
    const id = item.id;
    if (!groupedUC[id]) {
      groupedUC[id] = { ...item };
    } else {
      groupedUC[id].qty += item.qty;
    }
  }

  const ucItems = Object.values(groupedUC);
  const popularityItems = userData.popularity;
  const carsItems = userData.cars;
  const costumesItems = userData.costumes;

  const allItems = [...ucItems, ...popularityItems, ...carsItems, ...costumesItems];

  if (allItems.length === 0) return emptyReply();

  function formatTypeTag(type) {
    if (type === 'auto') return '(по ID) 🧑‍💻';
    // if (type === 'manual') return '(по ID) 🧑‍💻';
    // if (type === 'costume') return '(X-Костюм) 🎭';
    return '';
  }

  let total = 0;
  const messages = [];
  const itemButtons = [];

  for (const item of allItems) {
    if (!item || !item.id || !item.title || typeof item.price !== 'number') continue;

    const title = item.title || item.name || item.id || lang.cart.unknown_product;
    const qty = item.qty || 1;
    const price = item.price || 0;
    const sum = qty * price;
    total += sum;

    const tag = formatTypeTag(item.type);
    messages.push(`📦 ${title} x${qty} — ${sum} ${lang.currency} ${tag}`);

    itemButtons.push([
      Markup.button.callback(`➕ ${title}`, `inc_${item.id}`),
      Markup.button.callback(`➖`, `dec_${item.id}`),
      Markup.button.callback(`❌`, `del_${item.id}`)
    ]);
  }

  const controlButtons = [
    [Markup.button.callback(lang.buttons.confirm, "confirm_order")],
    [Markup.button.callback('🛍 Магазин', 'open_shop_menu')],
    [Markup.button.callback(lang.buttons.cancel, "cancel_order")]
  ];

  const keyboard = [...itemButtons, ...controlButtons].filter(Boolean);

  return ctx.reply(
    `${lang.cart.header}

${messages.join('\n')}

💰 ${lang.cart.total}: ${total} ${lang.currency}
🎮 PUBG ID: ${userData.id || lang.cart.no_id}
📍 ${lang.cart.status}`,
    Markup.inlineKeyboard(keyboard)
  );
}


async function callbackQuery(ctx) {
  const lang = await getLang(ctx);
  const userId = ctx.from.id;
  let userData = userSelections.get(userId);
  if (!userData) {
    userData = { uc: [], popularity: [], id: null };
    userSelections.set(userId, userData);
  }

  const data = ctx.callbackQuery.data;

  if (data === 'go_to_cart') {
    await ctx.answerCbQuery();
    return showCart(ctx);
  }

  if (data === 'confirm_order') {
    if (
      (!userData.uc || userData.uc.length === 0) &&
      (!userData.popularity || userData.popularity.length === 0) &&
      (!userData.cars || userData.cars.length === 0) &&
      (!userData.costumes || userData.costumes.length === 0)
    ) {
      return ctx.reply(lang.cart.select_first);
    }

    // --- FINAL STOCK CHECK ---
    const allItems = [
      ...(userData.uc || []),
      ...(userData.popularity || []),
      ...(userData.cars || []),
      ...(userData.costumes || [])
    ];
    for (const item of allItems) {
      let stock = 0;
      try {
        const res = await axios.get(`${process.env.API_URL || 'http://localhost:3001'}/admin/products/${item.id}`, {
          httpsAgent
        });
        stock = res.data?.stock ?? 0;
      } catch (err) {
        // fallback: try products endpoint
        try {
          const res = await axios.get(`${process.env.API_URL || 'http://localhost:3001'}/products`, {
            httpsAgent
          });
          const found = Array.isArray(res.data) ? res.data.find(p => p.id == item.id) : null;
          stock = found?.stock ?? 0;
        } catch (e) {
          stock = 0;
        }
      }
      if (item.qty > stock) {
        return ctx.reply(`❌ Недостаточно товара для "${item.title || item.name}". Осталось: ${stock} шт.`,
          Markup.inlineKeyboard([
            [Markup.button.callback('🛍 Магазин', 'open_shop_menu')]
          ])
        );
      }
    }
    // --- END FINAL STOCK CHECK ---

    // Check if any items require PUBG ID
    const needsPubgId = allItems.some(item => 
      item.type === 'auto' || // UC by ID
      item.type === 'manual' || // Popularity
      item.type === 'car' || // Cars
      item.type === 'costume' // Costumes
    );

    if (needsPubgId) {
      userData.expectingId = true;
      userSelections.set(userId, userData);
      return ctx.reply(
        `${lang.cart.enter_id}\n\n` +
        `⚠️ <b>Важно:</b> Введите только цифры вашего PUBG ID.\n` +
        `После ввода ID мы проверим его и покажем ваш никнейм для подтверждения.`,
        { parse_mode: 'HTML' }
      );
    }

    // If no PUBG ID needed, proceed with order
    return registerOrder(ctx, null, allItems);
  }

  if (data === 'cancel_order') {
    userSelections.delete(userId);
    await ctx.reply(
      lang.cart.cancelled,
      Markup.inlineKeyboard([
        [Markup.button.callback('🛍 Магазин', 'open_shop_menu')]
      ])
    );
    return ctx.answerCbQuery(lang.cart.cb_cancelled);
  }

  if (data === 'back_to_catalog') {
    await ctx.reply(
      lang.cart.select_package,
      Markup.inlineKeyboard([
        [Markup.button.callback(lang.buttons.open_catalog, "open_catalog")]
      ])
    );
    return ctx.answerCbQuery();
  }

  if (data === 'open_catalog') {
    await ctx.answerCbQuery();
    return require('./catalogRedirect')(ctx);
  }

  if (data.startsWith('inc_') || data.startsWith('dec_') || data.startsWith('del_')) {
  const id = parseInt(data.slice(4));

  const allItems = [
    ...(userData.uc || []),
    ...(userData.popularity || []),
    ...(userData.cars || []),
    ...(userData.costumes || [])
  ];

  const itemIndex = allItems.findIndex(p => p.id === id);
  if (itemIndex !== -1) {
    const item = allItems[itemIndex];

    if (data.startsWith('inc_')) {
        // Check stock before increasing
        try {
          const res = await axios.get(`${process.env.API_URL || 'http://localhost:3001'}/products`);
          const product = res.data.find(p => p.id === id);
          const stock = product?.stock ?? 0;
          if (item.qty + 1 > stock) {
            return ctx.answerCbQuery(`❌ Недостаточно товара на складе. Осталось: ${stock} шт.`, { show_alert: true });
          }
          item.qty += 1;
        } catch (err) {
          console.error('❌ Stock check error:', err.message);
          return ctx.answerCbQuery('❌ Ошибка при проверке наличия товара', { show_alert: true });
        }
    } else if (data.startsWith('dec_')) {
      item.qty -= 1;
      if (item.qty <= 0) allItems.splice(itemIndex, 1);
    } else if (data.startsWith('del_')) {
      allItems.splice(itemIndex, 1);
    }

    // Վերաբաշխում ըստ տեսակի
    userData.uc = allItems.filter(p => p.type === 'auto');
    userData.popularity = allItems.filter(p => p.type === 'manual');
    userData.cars = allItems.filter(p => p.type === 'car');
    userData.costumes = allItems.filter(p => p.type === 'costume');

    userSelections.set(userId, userData);
  }

  return showCart(ctx);
}

  if (data === 'open_uc_catalog') {
    await ctx.answerCbQuery();
    return require('./catalog').catalogCommand(ctx);
  }

  if (data === 'open_popularity_catalog') {
    await ctx.answerCbQuery();
    return require('./popular')(ctx);
  }

  if (data === 'catalog_redirect') {
    await ctx.answerCbQuery();
    return require('./catalogRedirect')(ctx);
  }

  if (data === 'open_shop_menu') {
    await ctx.answerCbQuery();
    return ctx.reply(lang.catalog.selectCategory || "📦 Выберите категорию", Markup.inlineKeyboard([
      [Markup.button.callback('💎 UC', 'open_uc_catalog')],
      [Markup.button.callback('📈 Популярность', 'open_popularity_catalog')],
      [Markup.button.callback('🚗 Машины', 'category:cars')]
    ]));
  }

  return ctx.answerCbQuery(lang.unknown_action);
}

// Add message handler for PUBG ID input
async function handleMessage(ctx) {
  const userId = ctx.from.id;
  const lang = await getLang(ctx);
  const userData = userSelections.get(userId);
  
  // Only proceed if we're expecting an ID
  if (!userData?.expectingId) return;
  
  const message = ctx.message.text.trim();
  
  // List of known menu/button texts (Russian and English)
  const menuButtons = [
    lang.menu.catalog,
    lang.menu.cart,
    lang.menu.orders,
    lang.menu.popularity,
    lang.menu.shop,
    lang.menu.referrals,
    lang.buttons.open_catalog,
    lang.buttons.confirm,
    lang.buttons.cancel,
    lang.buttons.add_more,
    lang.buttons.to_cart,
    lang.buttons.uc_catalog,
    lang.buttons.popularity_catalog,
    lang.buttons.back,
    lang.buttons.cars,
    lang.buttons.go_to_cart
  ];

  // Ignore commands and menu/button texts
  if (message.startsWith('/') || menuButtons.includes(message)) {
    ctx.state.handled = true;
    return;
  }

  // Only respond to 5-20 digit messages
  if (!/^\d{5,20}$/.test(message)) {
    ctx.state.handled = true;
    return ctx.reply('❌ Пожалуйста, введите корректный PUBG ID (только цифры, от 5 до 20 символов)');
  }

  // Verify PUBG ID
  const verification = await verifyPubgId(message, lang);
  ctx.state.handled = true;
  if (!verification.success) {
    return ctx.reply(verification.message || '❌ Не удалось проверить PUBG ID. Пожалуйста, проверьте ID и попробуйте снова.');
  }

  // Show confirmation with nickname
  userData.id = message;
  userData.nickname = verification.nickname;
  userData.expectingId = false;
  userSelections.set(userId, userData);

  await ctx.reply(
    `✅ <b>PUBG ID подтвержден!</b>\n\n` +
    `🎮 <b>ID:</b> <code>${message}</code>\n` +
    `👤 <b>Никнейм:</b> ${verification.nickname}\n\n` +
    `Ваш заказ оформлен и ожидает оплаты или обработки. Спасибо!`,
    { parse_mode: 'HTML' }
  );

  // Register the order and reset the cart/state
  await registerOrder(ctx, message, [...(userData.uc || []), ...(userData.popularity || []), ...(userData.cars || []), ...(userData.costumes || [])], verification.nickname);
  userSelections.delete(userId);
}

const statusLabels = {
  pending: "В обработке",
  manual_processing: "Менеджер",
  delivered: "Доставлен",
  error: "Ошибка",
};

module.exports = {
  showCart,
  callbackQuery,
  handleMessage,
  getPubgNickname
};







