// ===============================
// ✅ cart.js (վերջնական ուղղված տարբերակ՝ SHOP redirect + սինթաքս ֆիքսեր)
// ===============================

const { Markup } = require('telegraf');
const userSelections = require('../utils/userSelections');
const axios = require('axios');
const getAvailableProducts = require('../utils/getAvailableProducts');
const getLang = require('../utils/getLang');
require('dotenv').config();


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function getPubgNickname(pubgId) {
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
    if (type === 'auto') return '(по входу) ✅';
    if (type === 'manual') return '(по ID) 🧑‍💻';
    if (type === 'costume') return '(X-Костюм) 🎭';
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

    let available = [];
    try {
      available = await getAvailableProducts();
    } catch (err) {
      console.warn('⚠️ getAvailableProducts fallback in confirm_order');
    }
    const unavailableItems = userData.uc.filter(item =>
      item.type === 'auto' && available.length > 0 && !available.includes(item.id)
    );
    if (unavailableItems.length > 0) {
      return ctx.reply(`❌ ${lang.catalog.uc_issues_title}\n\n${unavailableItems.map(i => `▫️ ${i.title}`).join('\n')}\n\n${lang.catalog.please_edit_cart}`);
    }
    userData.expectingId = true;
    userSelections.set(userId, userData);
    return ctx.reply(lang.cart.enter_id);
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
      item.qty += 1;
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

exports.showCart = showCart;
exports.callbackQuery = callbackQuery;
exports.getPubgNickname = getPubgNickname;







