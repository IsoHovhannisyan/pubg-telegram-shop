// handlers/xcostumes.js

const { Markup } = require('telegraf');
const axios = require('axios');
const userSelections = require('../utils/userSelections');
const getLang = require('../utils/getLang');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// 📌 Step 1: Show all costumes
module.exports = async (ctx) => {
  const lang = await getLang(ctx);
  let costumes = [];
  try {
    const res = await axios.get(`${API_URL}/products?category=costumes&status=active`);
    costumes = res.data.filter(c => c.stock > 0)
      .sort((a, b) => a.price - b.price);
  } catch (err) {
    console.error('❌ Failed to load costumes from API:', err.message);
    return ctx.reply("❌ Костюмы сейчас недоступны.");
  }

  if (!costumes.length) {
    return ctx.reply("❌ Костюмы сейчас недоступны.");
  }

  const buttons = costumes.map(c =>
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
    let product;
    try {
      const res = await axios.get(`${API_URL}/products/${productId}`);
      product = res.data;
    } catch (err) {
      console.error('❌ Failed to load costume from API:', err.message);
      return ctx.answerCbQuery("❌ Костюм не найден", { show_alert: true });
    }

    if (!product || product.category !== 'costumes') {
      return ctx.answerCbQuery("❌ Костюм не найден", { show_alert: true });
    }

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
    let product;
    try {
      const res = await axios.get(`${API_URL}/products/${productId}`);
      product = res.data;
    } catch (err) {
      console.error('❌ Failed to load costume from API:', err.message);
      return ctx.answerCbQuery("❌ Костюм не найден", { show_alert: true });
    }

    if (!product || product.category !== 'costumes') {
      return ctx.answerCbQuery("❌ Костюм не найден", { show_alert: true });
    }

    // --- STOCK CHECK ---
    if (product.stock <= 0) {
      return ctx.answerCbQuery('❌ Товар закончился', { show_alert: true });
    }

    const userId = ctx.from.id;
    let userData = userSelections.get(userId) || { uc: [], popularity: [], cars: [], costumes: [], id: null };
    userData.costumes = userData.costumes || [];

    const existing = userData.costumes.find(p => p.id === product.id);
    if (existing) {
      if (existing.qty + 1 > product.stock) {
        return ctx.answerCbQuery(`❌ Недостаточно товара на складе. Осталось: ${product.stock} шт.`, { show_alert: true });
      }
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
      `${product.name} ✅ ${lang.catalog.added}\n🗃 В наличии: ${product.stock} шт.`,
      Markup.inlineKeyboard([
        [Markup.button.callback(lang.buttons.to_cart, 'go_to_cart')]
      ])
    );
  }
};
