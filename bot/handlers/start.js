const { Markup } = require('telegraf');
const userSelections = require('../utils/userSelections');

module.exports = async (ctx) => {
  const userId = ctx.from.id;
  userSelections.delete(userId);

  // Մենյուն չենք ցուցադրում, մինչև լեզուն չընտրվի
  await ctx.reply(
    "🇷🇺 Выберите язык / 🇬🇧 Choose a language",
    Markup.inlineKeyboard([
      [Markup.button.callback("🇷🇺 Русский", "lang_ru")],
      [Markup.button.callback("🇬🇧 English", "lang_en")]
    ])
  );
};









  