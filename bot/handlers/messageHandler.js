// ✅ Մաքրած տարբերակ — messageHandler.js
const getProductCategories = require('../utils/getProductCategories');
const getPubgNickname = require('./cart').getPubgNickname;
const userSelections = require('../utils/userSelections');
const registerOrder = require('./orderHandler');
const getLang = require('../utils/getLang');

const messageHandler = async (ctx) => {
  const lang = await getLang(ctx);
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
  delete userData.expectingId;
  userData.id = text;
  userData.username = ctx.from.username || null;

  userData.uc = (userData.uc || []).filter(item => item && item.id && item.title && typeof item.price === 'number');
  userData.popularity = (userData.popularity || []).filter(item => item && item.id && item.title && typeof item.price === 'number');
  userData.cars = (userData.cars || []).filter(item => item && item.id && item.title && typeof item.price === 'number');
  userData.costumes = (userData.costumes || []).filter(item => item && item.id && item.title && typeof item.price === 'number');

  userSelections.set(userId, userData);

  const allItems = [...(userData.uc || []), ...(userData.popularity || []), ...(userData.cars || []), ...(userData.costumes || [])];

  const grouped = {};
  for (const item of allItems) {
    const id = item.id;
    if (!grouped[id]) grouped[id] = { ...item };
    else grouped[id].qty += item.qty;
  }
  const groupedItems = Object.values(grouped);

  const categorized = await getProductCategories(groupedItems);
  const autoItems = categorized.filter(p => p.type === 'auto' && p.category === 'uc_by_id');
  const manualItems = categorized.filter(p => !(p.type === 'auto' && p.category === 'uc_by_id'));

  const productList = categorized.map(i => {
    const title = i.name || i.title || 'Անհայտ ապրանք';
    const sum = i.price * i.qty;
    return `📦 ${title} x${i.qty} — ${sum} ${lang.currency}`;
  }).join('\n');

  const autoTotal = autoItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const manualTotal = manualItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const total = autoTotal + manualTotal;

  await ctx.reply(
    `🛒 Ваш заказ зарегистрирован!\n\n` +
    `🎮 PUBG ID: ${text}\n👤 Ник: ${nickname}\n\n` +
    `${productList}\n\n` +
    `💰 Общая сумма: ${total} ${lang.currency}`
  );

  try {
    await registerOrder(ctx, text, [...autoItems, ...manualItems], nickname);
    userSelections.delete(userId);
  } catch (err) {
    console.error("❌ Պատվերի գրանցման սխալ:", err.message);
  }
};

module.exports = messageHandler;

