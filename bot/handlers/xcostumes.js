// handlers/xcostumes.js

const { Markup } = require('telegraf');
const db = require('../db/connect');
const axios = require('axios');
const userSelections = require('../utils/userSelections');
const getLang = require('../utils/getLang');

// 📌 Step 1: Show all costumes
module.exports = async (ctx) => {
  const lang = await getLang(ctx);
  const res = await db.query(
    "SELECT * FROM products WHERE category = 'costumes' AND status = 'active' AND stock > 0 ORDER BY price ASC"
  );

  if (res.rows.length === 0) {
    return ctx.reply("❌ Костюмы сейчас недоступны.");
  }

  const buttons = res.rows.map(c =>
    [Markup.button.callback(`🎭 ${c.name} — ${c.price} ${lang.currency}`, `show_costume_${c.id}`)]
  );

  return ctx.reply(lang.catalog.selectCostume || "🎭 Выберите костюм:", Markup.inlineKeyboard(buttons));
};

// 📌 Step 2: Show costume details
module.exports.callbackQuery = async (ctx) => {
  const selected = ctx.callbackQuery.data;
  const lang = await getLang(ctx);

  if (selected.startsWith('show_costume_')) {
    const productId = selected.split('_')[2];
    const res = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    const product = res.rows[0];

    if (!product || product.category !== 'costumes') {
      return ctx.answerCbQuery("❌ Костюм не найден", { show_alert: true });
    }

    const API_URL = process.env.API_URL || 'http://localhost:3001';
    let imageUrl = product.image;
    if (!imageUrl.startsWith('http')) {
      imageUrl = `${API_URL}/uploads/${product.image}`;
    }

    const caption = `🎭 <b>${product.name}</b>\n💵 <b>${product.price} ${lang.currency}</b>`;

    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');

      await ctx.replyWithPhoto(
        { source: buffer, filename: 'costume.jpg' },
        {
          caption,
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(lang.buttons.go_to_cart, `costume_${product.id}`)]
          ])
        }
      );
    } catch (err) {
      console.error('❌ Image fetch/send failed:', err.message);
      await ctx.replyWithHTML(caption);
    }

    return ctx.answerCbQuery();
  }

  // ✅ Add to cart
  if (selected.startsWith('costume_')) {
    const productId = selected.split('_')[1];
    const res = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    const product = res.rows[0];

    if (!product || product.category !== 'costumes') {
      return ctx.answerCbQuery("❌ Костюм не найден", { show_alert: true });
    }

    const userId = ctx.from.id;
    let userData = userSelections.get(userId) || { uc: [], popularity: [], cars: [], costumes: [], id: null };
    userData.costumes = userData.costumes || [];

    const existing = userData.costumes.find(p => p.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      userData.costumes.push({
        id: product.id,
        title: product.name,
        price: product.price,
        type: product.type,
        qty: 1
      });
    }

    userSelections.set(userId, userData);

    await ctx.reply(
      `${product.name} ✅ ${lang.catalog.added}`,
      Markup.inlineKeyboard([
        [Markup.button.callback(lang.buttons.to_cart, 'go_to_cart')]
      ])
    );
  }
};
