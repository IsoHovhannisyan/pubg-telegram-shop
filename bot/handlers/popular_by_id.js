const { Markup } = require('telegraf');
const axios = require('axios');
const userSelections = require('../utils/userSelections');
const getLang = require('../utils/getLang');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// 📋 Показывает popular by ID меню через admin-api
module.exports = async (ctx) => {
  const lang = await getLang(ctx);

  let items = [];
  try {
    const res = await axios.get(`${API_URL}/products?category=popularity_by_id`);
    items = res.data.filter(item => item.stock > 0)
      .sort((a, b) => a.price - b.price);
  } catch (err) {
    console.error("❌ Popular by ID API error:", err.message);
    return ctx.reply("⚠️ Временно недоступно.");
  }

  if (!items.length) {
    return ctx.reply("⚠️ Временно недоступно.");
  }

  const rows = items.map(item => [
    Markup.button.callback(`${item.name} – ${item.price} ${lang.currency}`, `pop_${item.id}`)
  ]);
  rows.push([Markup.button.callback(lang.buttons.to_cart, "go_to_cart")]);

  await ctx.reply(
    lang.catalog.select_popularity || "📢 Выберите пакет популярности",
    Markup.inlineKeyboard(rows)
  );

  // Кэшируем
  const userId = ctx.from.id;
  const userData = userSelections.get(userId) || { uc: [], popularity: [], id: null };
  userData._popularityList = items;
  userSelections.set(userId, userData);
};

// 📥 Callback
module.exports.callbackQuery = async (ctx) => {
  const selected = ctx.callbackQuery.data;
  const id = selected.replace("pop_", "");

  const userId = ctx.from.id;
  let userData = userSelections.get(userId) || { uc: [], popularity: [], id: null };
  let list = userData._popularityList;

  // If not cached, fetch again
  if (!Array.isArray(list) || !list.length) {
    try {
      const res = await axios.get(`${API_URL}/products?category=popularity_by_id`);
      list = res.data;
      userData._popularityList = list;
      userSelections.set(userId, userData);
    } catch (err) {
      return ctx.answerCbQuery("❌ Ошибка загрузки товаров", { show_alert: true });
    }
  }

  const item = list.find(p => p.id.toString() === id);

  if (!item) {
    console.log("❌ Unknown product callback:", selected);
    return ctx.answerCbQuery("❌ Անհայտ ապրանք", { show_alert: true });
  }

  if (userData.expectingId) {
    delete userData.expectingId;
  }

  userData.popularity = userData.popularity || [];

  const existing = userData.popularity.find(p => p.id === item.id);
  if (existing) {
    // Check stock from list
    const stock = item.stock ?? 0;
    if (existing.qty + 1 > stock) {
      return ctx.answerCbQuery(`❌ Недостаточно товара на складе. Осталось: ${stock} шт.`, { show_alert: true });
    }
    existing.qty += 1;
  } else {
    const stock = item.stock ?? 0;
    if (stock <= 0) {
      return ctx.answerCbQuery('❌ Товар закончился', { show_alert: true });
    }
    userData.popularity.push({
      id: item.id,
      title: item.name,
      price: item.price,
      type: 'manual',
      qty: 1
    });
  }

  userSelections.set(userId, userData);

  const lang = await getLang(ctx);
  await ctx.reply(
    `${item.name} ✅ ${lang.catalog.added}\n🗃 В наличии: ${item.stock ?? 0} шт.`,
    Markup.inlineKeyboard([
      [Markup.button.callback(lang.buttons.to_cart, "go_to_cart")]
    ])
  );

  await ctx.answerCbQuery();
};

