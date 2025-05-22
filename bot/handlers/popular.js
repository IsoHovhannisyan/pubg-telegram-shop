const { Markup } = require('telegraf');

const getLang = require('../utils/getLang');

module.exports = async (ctx) => {
  const lang = await getLang(ctx);
  await ctx.reply(
    lang.catalog.select_popularity || "📢 Ընտրիր տեսակը",
    Markup.inlineKeyboard([
      [Markup.button.callback("📌 Популярность по ID", "go_popularity_by_id")],
      [Markup.button.callback("🏠 Популярность дома", "go_popularity_home")],
    ])
  );
};
