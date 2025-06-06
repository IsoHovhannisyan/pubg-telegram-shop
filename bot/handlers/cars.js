const { Markup } = require('telegraf');
const axios = require('axios');
const userSelections = require('../utils/userSelections');
const getLang = require('../utils/getLang');
const getShopStatus = require('../middlewares/checkShopStatus').getShopStatus;

const API_URL = process.env.API_URL || 'http://localhost:3001';

// 📌 Step 1: Show all cars as buttons only
module.exports = async (ctx) => {
  const lang = await getLang(ctx);
  const status = await getShopStatus();
  if (status && status.cars_enabled === false) {
    return ctx.reply('🚗 Машины временно недоступны.');
  }
  let cars = [];
  try {
    const res = await axios.get(`${API_URL}/products?category=cars&status=active`);
    cars = res.data.filter(car => car.stock > 0)
      .sort((a, b) => a.price - b.price);
  } catch (err) {
    console.error('❌ Failed to load cars from API:', err.message);
    return ctx.reply("❌ Мaшины сейчас недоступны.");
  }

  if (!cars.length) {
    return ctx.reply("❌ Мaшины сейчас недоступны.");
  }

  const buttons = cars.map(car =>
    [Markup.button.callback(`🚗 ${car.name} — ${car.price} ${lang.currency}`, `show_car_${car.id}`)]
  );

  return ctx.reply(lang.catalog.selectCar || "🚗 Выберите машину:", Markup.inlineKeyboard(buttons));
};

// 📌 Step 2: When clicking a specific car button, show image + caption + add to cart
module.exports.callbackQuery = async (ctx) => {
  const status = await getShopStatus();
  const lang = await getLang(ctx);
  if (status && status.cars_enabled === false) {
    return ctx.answerCbQuery('🚗 Машины временно недоступны.', { show_alert: true });
  }
  const selected = ctx.callbackQuery.data;

  if (selected.startsWith('show_car_')) {
    const productId = selected.split('_')[2];
    let product;
    try {
      const res = await axios.get(`${API_URL}/products/${productId}`);
      product = res.data;
    } catch (err) {
      console.error('❌ Failed to load car from API:', err.message);
      return ctx.answerCbQuery("❌ Машина не найдена", { show_alert: true });
    }

    if (!product || product.category !== 'cars') {
      return ctx.answerCbQuery("❌ Машина не найдена", { show_alert: true });
    }

    let imageUrl = product.image;
    if (!imageUrl.startsWith('http')) {
      imageUrl = `${API_URL}/uploads/${product.image}`;
    }

    const caption = `🚗 <b>${product.name}</b>\n💵 <b>${product.price} ${lang.currency}</b>`;

    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');

      await ctx.replyWithPhoto(
        { source: buffer, filename: 'car.jpg' },
        {
          caption,
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(lang.buttons.go_to_cart, `car_${product.id}`)]
          ])
        }
      );
    } catch (err) {
      console.error('❌ Image fetch/send failed:', err.message);
      await ctx.replyWithHTML(caption);
    }

    return ctx.answerCbQuery();
  }

  // ✅ Add to cart logic (car_123)
  if (selected.startsWith('car_')) {
    const productId = selected.split('_')[1];
    let product;
    try {
      const res = await axios.get(`${API_URL}/products/${productId}`);
      product = res.data;
    } catch (err) {
      console.error('❌ Failed to load car from API:', err.message);
      return ctx.answerCbQuery("❌ Машина не найдена", { show_alert: true });
    }

    if (!product || product.category !== 'cars') {
      return ctx.answerCbQuery("❌ Машина не найдена", { show_alert: true });
    }

    // --- STOCK CHECK ---
    if (product.stock <= 0) {
      return ctx.answerCbQuery('❌ Товар закончился', { show_alert: true });
    }

    const userId = ctx.from.id;
    let userData = userSelections.get(userId) || { uc: [], popularity: [], cars: [], id: null };
    userData.cars = userData.cars || [];

    const existing = userData.cars.find(p => p.id === product.id);
    if (existing) {
      if (existing.qty + 1 > product.stock) {
        return ctx.answerCbQuery(`❌ Недостаточно товара на складе. Осталось: ${product.stock} шт.`, { show_alert: true });
      }
      existing.qty += 1;
    } else {
      userData.cars.push({
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
