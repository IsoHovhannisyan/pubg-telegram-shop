const { Markup } = require('telegraf');
const db = require('../db/connect');
const axios = require('axios');
const userSelections = require('../utils/userSelections');
const getLang = require('../utils/getLang');

// 📌 Step 1: Show all cars as buttons only
module.exports = async (ctx) => {
  const lang = await getLang(ctx);
  const res = await db.query(
    "SELECT * FROM products WHERE category = 'cars' AND status = 'active' AND stock > 0 ORDER BY price ASC"
  );

  if (res.rows.length === 0) {
    return ctx.reply("❌ Մեքենաներ այս պահին հասանելի չեն։");
  }

  const buttons = res.rows.map(car =>
    [Markup.button.callback(`🚗 ${car.name} — ${car.price} ${lang.currency}`, `show_car_${car.id}`)]
  );

  return ctx.reply(lang.catalog.selectCar || "🚗 Выберите машину:", Markup.inlineKeyboard(buttons));
};

// 📌 Step 2: When clicking a specific car button, show image + caption + add to cart
module.exports.callbackQuery = async (ctx) => {
  const selected = ctx.callbackQuery.data;
  const lang = await getLang(ctx);

  if (selected.startsWith('show_car_')) {
    const productId = selected.split('_')[2];
    const res = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    const product = res.rows[0];

    if (!product || product.category !== 'cars') {
      return ctx.answerCbQuery("❌ Машина не найдена", { show_alert: true });
    }

    const API_URL = process.env.API_URL || 'http://localhost:3001';
    let imageUrl = product.image;

    // Եթե product.image-ը չի սկսվում http-ով, նշանակում է filename է
    if (!imageUrl.startsWith('http')) {
      imageUrl = `${API_URL}/uploads/${product.image}`;
    }

    console.log("📦 Final imageUrl:", imageUrl);

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
    const res = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    const product = res.rows[0];

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
