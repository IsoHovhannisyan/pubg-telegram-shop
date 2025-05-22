const { Markup } = require('telegraf');
const db = require('../db/connect');
const userSelections = require('../utils/userSelections');

const getLang = require('../utils/getLang');

// 📋 Ցուցադրում է popular by ID մենյուն՝ բազայից
module.exports = async (ctx) => {
  const lang = await getLang(ctx);

  let items = [];
  try {
    const res = await db.query(`
      SELECT id, name, price FROM products
      WHERE category = 'popularity_by_id' AND status = 'active'
      ORDER BY price ASC
    `);
    items = res.rows;
  } catch (err) {
    console.error("❌ Popular by ID DB error:", err.message);
    return ctx.reply("⚠️ Ժամանակավորապես անհասանելի է։");
  }

  if (!items.length) {
    return ctx.reply("⚠️ Ժամանակավորապես անհասանելի է։");
  }

  const rows = items.map(item => [
    Markup.button.callback(`${item.name} – ${item.price} ${lang.currency}`, `pop_${item.id}`)
  ]);
  rows.push([Markup.button.callback(lang.buttons.to_cart, "go_to_cart")]);

  await ctx.reply(
    lang.catalog.select_popularity || "📢 Ընտրիր популярность փաթեթ",
    Markup.inlineKeyboard(rows)
  );

  // Պահում ենք cache
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
  const list = userData._popularityList || [];

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

