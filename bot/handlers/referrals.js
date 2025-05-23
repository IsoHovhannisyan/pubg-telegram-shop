const axios = require('axios');
const getLang = require('../utils/getLang');

module.exports = async function referralsHandler(ctx) {
  const lang = await getLang(ctx);
  const userId = ctx.from.id;
  // Получаем username бота из env или используем плейсхолдер
  const botUsername = process.env.BOT_USERNAME || 'YourBot';
  const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;
  try {
    // Получаем список приглашённых этим пользователем
    const res = await axios.get(`${process.env.API_URL}/admin/referrals/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` }
    });
    const referrals = res.data;
    const count = referrals.length;

    let message = `👥 <b>Ваша реферальная система</b>\n\n`;
    message += `🔗 <b>Ваша реферальная ссылка:</b> <code>${referralLink}</code>\n`;
    message += `Отправьте эту ссылку друзьям, чтобы пригласить их и получать бонусы!\n`;
    message += `👤 <b>Вы пригласили:</b> <b>${count}</b> чел.\n`;

    if (count > 0) {
      message += `\n<b>Список приглашённых:</b>\n`;
      referrals.forEach((r, i) => {
        message += `${i + 1}. <b>ID:</b> <code>${r.user_id}</code> | <b>Уровень:</b> ${r.level} | <b>Дата:</b> ${r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}\n`;
      });
    } else {
      message += `\nУ вас пока нет приглашённых пользователей.`;
    }

    await ctx.replyWithHTML(message);
  } catch (err) {
    console.error('Ошибка при получении рефералов:', err);
    await ctx.reply('❌ Не удалось получить ваши рефералы. Попробуйте позже.');
  }
}; 