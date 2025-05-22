// ✅ handlers/catalogRedirect.js
const { Markup } = require('telegraf');
const getLang = require('../utils/getLang');

module.exports = async (ctx) => {
  const lang = await getLang(ctx);
  await ctx.reply(
    lang.catalog.select_type,
    Markup.inlineKeyboard([
      [Markup.button.callback('📥 UC по входу', 'open_uc_auto')],
      [Markup.button.callback('👤 UC по ID', 'open_uc_manual')]
    ])
  );
};
