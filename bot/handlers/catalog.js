// ===============================
// ✅ 4. catalog.js (լիարժեք տարբերակ՝ UC по входу / по ID բաժանումով)
// ===============================

const { Markup } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const userSelections = require('../utils/userSelections');
const { getPubgNickname } = require('./cart');
const registerOrder = require('./orderHandler');
const getAvailableProducts = require('../utils/getAvailableProducts');
const checkUCQuantities = require('../utils/checkUCQuantities');
const generateFreekassaLink = require('../utils/freekassaLink');

async function getLang(ctx) {
  let langCode = 'ru'; // Default language
  try {
    const response = await axios.get(`${process.env.API_URL}/admin/users/${ctx.from.id}/language`);
    langCode = response.data.language || 'ru';
  } catch (error) {
    console.error('Error fetching user language:', error);
  }
  return require(`../../lang/${langCode}`);
}
function getUCType(id) {
  return manualUC.includes(id) ? 'manual' : 'auto';
}

function buildCatalogKeyboard(lang, filteredList) {
  const rows = [];
  for (let i = 0; i < filteredList.length; i += 2) {
    const row = [];
    row.push(Markup.button.callback(filteredList[i].name, filteredList[i].value));
    if (filteredList[i + 1]) {
      row.push(Markup.button.callback(filteredList[i + 1].name, filteredList[i + 1].value));
    }
    rows.push(row);
  }
  rows.push([Markup.button.callback(lang.buttons.to_cart, "go_to_cart")]);
  return rows;
}

const catalogCommand = async (ctx, type = 'auto') => {
  const lang = await getLang(ctx);
  const category = type === 'manual' ? 'uc_by_login' : 'uc_by_id';
  try {
    const response = await axios.get(`${process.env.API_URL}/products?category=${category}`);
    const rows = response.data.filter(product => product.stock > 0)
      .sort((a, b) => a.price - b.price);
    const filtered = rows.map(product => ({
      name: product.name_ru || product.name,
      value: `uc_${product.id}`,
    }));
    const buttons = buildCatalogKeyboard(lang, filtered);
    const title = type === 'manual' ? lang.catalog.select_uc_manual : lang.catalog.select_uc;
    await ctx.reply(title, Markup.inlineKeyboard(buttons));
  } catch (err) {
    console.error('❌ Failed to load UC from DB:', err.message);
    await ctx.reply(lang.errors.catalog_load_failed || '❌ Catalog load failed.');
  }
};

const callbackQuery = async (ctx) => {
  const lang = await getLang(ctx);
  const selected = ctx.callbackQuery.data;

  if (selected === 'go_to_cart') {
    return require('./cart').showCart(ctx);
  }

  if (!selected.startsWith('uc_')) {
    return ctx.answerCbQuery(lang.unknown_action || "❌ Սխալ կամ անթույլատրելի ընտրություն", { show_alert: true });
  }

  const productId = parseInt(selected.replace('uc_', ''));

  try {
    const response = await axios.get(`${process.env.API_URL}/products/${productId}`);
    const product = response.data;

    if (!product) {
      return ctx.answerCbQuery("❌ UC пакет не найден", { show_alert: true });
    }

    // ✅ UC по входу ապրանքները չպետք է ավելանան զամբյուղ
    if (product.category === 'uc_by_login') {
      return ctx.reply(
        '🛠 Этот товар оформляется через менеджера @Inv1s_shop',
        Markup.inlineKeyboard([
          [Markup.button.url('📩 Написать менеджеру', 'https://t.me/Inv1s_shop')]
        ])
      );
    }

    // --- STOCK CHECK ---
    if (product.stock <= 0) {
      return ctx.answerCbQuery('❌ Товар закончился', { show_alert: true });
    }

    const userId = ctx.from.id;
    let userData = userSelections.get(userId) || { uc: [], id: null };

    const existing = userData.uc.find(p => p.id === product.id);
    if (existing) {
      if (existing.qty + 1 > product.stock) {
        return ctx.answerCbQuery(`❌ Недостаточно товара на складе. Осталось: ${product.stock} шт.`, { show_alert: true });
      }
      existing.qty += 1;
    } else {
      userData.uc.push({
        id: product.id,
        title: product.name_ru || product.name,
        price: product.price,
        type: product.type,
        qty: 1
      });
    }

    userSelections.set(userId, userData);

    await ctx.answerCbQuery();
    await ctx.reply(
      `${product.name_ru || product.name} ✅ ${lang.catalog.added}\n🗃 В наличии: ${product.stock} шт.`,
      Markup.inlineKeyboard([
        [Markup.button.callback(lang.buttons.to_cart, "go_to_cart")]
      ])
    );
  } catch (err) {
    console.error('❌ Product fetch error:', err.message);
    await ctx.answerCbQuery(lang.errors.catalog_load_failed || "❌ Ապրանքը անհասանելի է", { show_alert: true });
  }
};

module.exports = catalogCommand;
module.exports.callbackQuery = callbackQuery;
module.exports.catalogCommand = catalogCommand;















