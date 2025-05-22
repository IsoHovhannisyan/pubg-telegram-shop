const axios = require('axios');
const { Markup } = require('telegraf');
const userSelections = require('../utils/userSelections');
const getLang = require('../utils/getLang');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// 📋 Ցուցադրում է մենյուն (API-ից բեռնում է)
module.exports = async (ctx) => {
  const lang = await getLang(ctx);

  let items = [];
  try {
    const res = await axios.get(`${API_URL}/products?category=popularity_home_by_id`);
    items = res.data;
  } catch (err) {
    console.error("❌ Popular Home fetch error:", err.message);
    return ctx.reply("⚠️ Ժամանակավորապես անհասանելի է։");
  }

  const rows = items.map(item => [
    Markup.button.callback(`${item.name} – ${item.price} ${lang.currency}`, `pophome_${item.id}`)
  ]);
  rows.push([Markup.button.callback(lang.buttons.to_cart, "go_to_cart")]);

  await ctx.reply(
    lang.catalog.select_popularity_home || "🏠 Ընտրիր տան հարգանքի փաթեթ",
    Markup.inlineKeyboard(rows)
  );

  // Cache պահում
  const userId = ctx.from.id;
  const userData = userSelections.get(userId) || { uc: [], popularity: [], id: null };
  userData._popularityHomeList = items;
  userSelections.set(userId, userData);
};

// 📥 Callback logic
module.exports.callbackQuery = async (ctx) => {
  const selected = ctx.callbackQuery.data;
  const id = selected.replace("pophome_", "");

  const userId = ctx.from.id;
  let userData = userSelections.get(userId) || { uc: [], popularity: [], id: null };
  const list = userData._popularityHomeList || [];

  const item = list.find(p => p.id.toString() === id);

  if (!item) {
    console.log("❌ Unknown product callback:", selected);
    return ctx.answerCbQuery("❌ Անհայտ ապրանք", { show_alert: true });
  }

  userData.popularity = userData.popularity || [];

  if (userData.expectingId) {
  delete userData.expectingId;
  }

  const existing = userData.popularity.find(p => p.id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
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
    `${item.name} ✅ ${lang.catalog.added}`,
    Markup.inlineKeyboard([
      [Markup.button.callback(lang.buttons.to_cart, "go_to_cart")]
    ])
  );

  await ctx.answerCbQuery();
};
