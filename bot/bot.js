// ===============================
// ✅ bot.js (финальный: SHOP + выбор UC/Популярности)
// ===============================

const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();
// require('../admin-api/adminApi');
const express = require('express');
const bodyParser = require('body-parser');

const startHandler = require('./handlers/start');
const catalog = require('./handlers/catalog');
const catalogAuto = require('./handlers/catalogAuto');
const catalogManual = require('./handlers/catalogManual');
const cartHandler = require('./handlers/cart');
const orderHandler = require('./handlers/orders');
const registerOrder = require('./handlers/orderHandler');
const popularById = require('./handlers/popular_by_id');
const popularHome = require('./handlers/popular_home');
const carsHandler = require('./handlers/cars');
const db = require('./db/connect');
const { handleUserIdSubmission } = require('./handlers/sendOrderToCorrectTarget');
const costumesHandler = require('./handlers/xcostumes');
const referralsHandler = require('./handlers/referrals');
const checkShopStatus = require('./middlewares/checkShopStatus');

const getLang = require('./utils/getLang');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(checkShopStatus);

// 📦 start-команда
bot.start(async (ctx) => {
  // const lang = await getLang(ctx); // Removed to prevent warning before language selection
  await require('./handlers/start')(ctx);
  // После выбора языка, показываем главное меню с кнопкой рефералов
  // (логика показа меню после выбора языка уже есть в lang callback, но дублируем для старта)
  // (если меню показывается только после выбора языка, то этот блок можно не дублировать)
});

// 📚 Команды
bot.command('cart', cartHandler.showCart);
bot.command('orders', orderHandler);

// 🔁 Обработка кнопок меню
bot.hears(async (text, ctx) => {
  const lang = await getLang(ctx);

  if (text === lang.menu.shop || text === lang.menu.catalog) {
    return ctx.reply(lang.catalog.selectCategory || "📦 Выберите категорию", Markup.inlineKeyboard([
      [Markup.button.callback('💎 UC', 'open_uc_catalog')],
      [Markup.button.callback('📈 Популярность', 'open_popularity_catalog')],
      [Markup.button.callback('🚗 Машины', 'category:cars')],
      [Markup.button.callback('🎭 X-Костюмы', 'category:xcostumes')]
    ]));
  }

  if (text === lang.menu.cart) return cartHandler.showCart(ctx);
  if (text === lang.menu.orders) return orderHandler(ctx);
  if (text === lang.menu.referrals) return referralsHandler(ctx);
});

// 🟡 Централизованная обработка callback_query
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const lang = await getLang(ctx);

  // ✅ Выбор языка
  if (data.startsWith('lang_')) {
    const selectedLang = data.split('_')[1];
    await db.query(
      `INSERT INTO users (telegram_id, language)
       VALUES ($1, $2)
       ON CONFLICT (telegram_id) DO UPDATE
       SET language = EXCLUDED.language`,
      [ctx.from.id, selectedLang]
    );
    const langFile = require(`../lang/${selectedLang}`);
    await ctx.reply(langFile.start.welcome, Markup.keyboard([
      [langFile.menu.shop],
      [langFile.menu.orders],
      [langFile.menu.cart],
      [langFile.menu.referrals]
    ]).resize());
    return ctx.answerCbQuery("✅ Язык изменён");
  }

  // ✅ Подкатегории UC
  if (data === 'open_uc_catalog') {
    return ctx.reply("💎 Выберите тип UC", Markup.inlineKeyboard([
      [Markup.button.callback('⚡️ UC по ID', 'open_uc_auto')],
      [Markup.button.callback('🧾 UC по входу', 'open_uc_manual')]
    ]));
  }

  // ✅ Подкатегории Популярности
  if (data === 'open_popularity_catalog') {
    return ctx.reply("📈 Выберите тип популярности", Markup.inlineKeyboard([
      [Markup.button.callback('👤 Популярность по ID', 'go_popularity_by_id')],
      [Markup.button.callback('🏠 Популярность дома по ID', 'go_popularity_home')]
    ]));
  }

  // ✅ Обработка подкатегорий
  if (data === 'open_uc_auto') return catalogAuto(ctx);
  if (data === 'open_uc_manual') return catalogManual(ctx);
  if (data === 'go_popularity_by_id') return popularById(ctx);
  if (data === 'go_popularity_home') return popularHome(ctx);
  if (data === 'category:cars') return carsHandler(ctx);

  // ✅ Меню магазина из кнопки "🛍 Магазин"
  if (data === 'open_shop_menu') {
    try {
      await ctx.answerCbQuery('📦 Открываю магазин...');
    } catch (err) {
      console.warn('⚠️ answerCbQuery error:', err.message);
    }

    return ctx.reply(lang.catalog?.selectCategory || "📦 Выберите категорию", Markup.inlineKeyboard([
      [Markup.button.callback('💎 UC', 'open_uc_catalog')],
      [Markup.button.callback('📈 Популярность', 'open_popularity_catalog')],
      [Markup.button.callback('🚗 Машины', 'category:cars')],
      [Markup.button.callback('🎭 X-Костюмы', 'category:xcostumes')]
    ]));
  }

  // ✅ Callback-и товаров
  if (data.startsWith('uc_')) return catalog.callbackQuery(ctx);
  if (data.startsWith('pop_')) return popularById.callbackQuery(ctx);
  if (data.startsWith('pophome_')) return popularHome.callbackQuery(ctx);
  if (data.startsWith('car_') || data.startsWith('show_car_')) return carsHandler.callbackQuery(ctx);
  if (data.startsWith('costume_') || data.startsWith('show_costume_')) return costumesHandler.callbackQuery(ctx);
  if (data === 'category:xcostumes') return costumesHandler(ctx);

  // ✅ Callback-и корзины
  if (["inc_", "dec_", "del_"].some(p => data.startsWith(p))) return cartHandler.callbackQuery(ctx);

  if ([
    "go_to_cart",
    "open_catalog",
    "open_uc_catalog",
    "open_popularity_catalog",
    "confirm_order",
    "cancel_order",
    "back_to_catalog",
    "go_back"
  ].includes(data)) return cartHandler.callbackQuery(ctx);

  if (data === 'open_referrals') return referralsHandler(ctx);
});

// 🧾 Ввод PUBG ID
bot.on('text', async (ctx) => {
  // First try the cart handler for PUBG ID verification
  await cartHandler.handleMessage(ctx);
  
  // If the message wasn't handled by cart handler, try the user ID submission
  if (!ctx.state.handled) {
    await handleUserIdSubmission(ctx);
  }
});

// ▶️ Запуск бота
bot.launch();
console.log('✅ Бот успешно запущен с мультиязычным SHOP-меню');

const app = express();
app.use(bodyParser.json());

const BOT_API_SECRET = process.env.BOT_API_SECRET;

app.post('/send-message', async (req, res) => {
  const { userId, message, secret, reply_markup, parse_mode } = req.body;
  if (secret !== BOT_API_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' });
  }
  try {
    await bot.telegram.sendMessage(
      userId,
      message,
      {
        reply_markup: reply_markup,
        parse_mode: parse_mode || 'HTML'
      }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to send message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

const BOT_HTTP_PORT = process.env.BOT_HTTP_PORT || 4000;
app.listen(BOT_HTTP_PORT, () => {
  console.log(`Bot HTTP API listening on port ${BOT_HTTP_PORT}`);
});

module.exports = { bot };












