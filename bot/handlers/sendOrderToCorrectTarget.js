// ✅ Մաքրած տարբերակ — sendOrderToCorrectTarget.js
const db = require('../db/connect');
const userSelections = require('../utils/userSelections');
const { getPubgNickname } = require('./cart');
const getLang = require('../utils/getLang');
const registerOrder = require('./orderHandler');

async function getProductCategories(items) {
  const ids = items.map(i => parseInt(i.id)).filter(id => !isNaN(id));
  if (ids.length === 0) return items;

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const res = await db.query(
    `SELECT id, category FROM products WHERE id IN (${placeholders})`,
    ids
  );

  const categoryMap = {};
  res.rows.forEach(row => {
    categoryMap[row.id] = row.category;
  });

  return items.map(i => {
    const parsedId = parseInt(i.id);
    return {
      ...i,
      category: !isNaN(parsedId) ? (categoryMap[parsedId] || 'Без категории') : 'Без категории'
    };
  });
}

async function handleUserIdSubmission(ctx) {
  const lang = await getLang(ctx);
  if (!ctx.message || !ctx.message.text) return;

  const text = ctx.message.text.trim();
  const userId = ctx.from.id;
  const userData = userSelections.get(userId);

  if (!userData || !userData.expectingId) return;

  if (!/^[0-9]{5,20}$/.test(text)) {
    return ctx.reply(lang.invalid_pubg_id);
  }

  const result = await getPubgNickname(text);
  if (!result.success) {
    return ctx.reply(lang.catalog.nickname_error);
  }

  const nickname = result.nickname;
  userData.id = text;
  userData.username = ctx.from.username || null;
  delete userData.expectingId;

  userSelections.set(userId, userData);

  const allItems = [
    ...(userData.uc || []),
    ...(userData.popularity || []),
    ...(userData.cars || []),
    ...(userData.costumes || [])
  ].filter(item => item && item.id && typeof item.price === 'number');

  const grouped = {};
  let total = 0;
  for (const item of allItems) {
    if (!grouped[item.id]) grouped[item.id] = { ...item };
    else grouped[item.id].qty += item.qty;
    total += item.price * item.qty;
  }

  const groupedItems = Object.values(grouped);

  const productList = groupedItems.map(i => {
    return `📦 ${i.title || i.name} x${i.qty} — ${i.price * i.qty} ${lang.currency}`;
  }).join('\n');

  // const categorized = await getProductCategories(groupedItems);
  // await ctx.reply(`🛒 Ваш заказ зарегистрирован!\n\n🎮 PUBG ID: ${text}\n👤 Ник: ${nickname}\n${productList}\n\n💰 Общая сумма: ${total}${lang.currency}`);

  try {
    await registerOrder(ctx, text, groupedItems, nickname);
    userSelections.delete(userId);
  } catch (err) {
    console.error("❌ Պատվերի գրանցման սխալ:", err.message);
  }
}

module.exports = {
  handleUserIdSubmission
};
