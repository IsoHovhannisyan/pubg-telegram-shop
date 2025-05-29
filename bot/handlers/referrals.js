const axios = require('axios');
const getLang = require('../utils/getLang');

function format(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

module.exports = async function referralsHandler(ctx) {
  const lang = await getLang(ctx);
  const userId = ctx.from.id;
  const referral = lang.referral;
  const botUsername = process.env.BOT_USERNAME || 'YourBot';
  const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;
  try {
    const res = await axios.get(`${process.env.API_URL}/admin/referrals/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` }
    });
    const referrals = res.data;
    const level1 = referrals.filter(r => r.level === 1);
    const level2 = referrals.filter(r => r.level === 2);
    const stats = refs => ({
      count: refs.length,
      orders: refs.reduce((sum, r) => sum + Number(r.total_orders || 0), 0),
      revenue: refs.reduce((sum, r) => sum + Number(r.total_revenue || 0), 0),
      points: refs.reduce((sum, r) => sum + Number(r.commission || 0), 0),
    });
    const s1 = stats(level1);
    const s2 = stats(level2);
    const totalPoints = s1.points + s2.points;

    let message = `${referral.header}\n\n`;
    message += `${referral.link_label} <code>${referralLink}</code>\n`;
    message += `${referral.instruction}\n\n`;
    message += `${referral.level1_expl}\n`;
    message += `${referral.level2_expl}\n`;
    message += `\n<i>${referral.note}</i>\n`;
    message += `\n${referral.invited_friends} <b>${s1.count}</b>\n`;
    message += `${referral.friends_of_friends} <b>${s2.count}</b>\n`;
    message += `\n${referral.paid_orders}\n`;
    message += format(referral.paid_orders_level1, { orders: s1.orders, revenue: s1.revenue }) + "\n";
    message += format(referral.paid_orders_level2, { orders: s2.orders, revenue: s2.revenue }) + "\n";
    if (s2.orders === 0) {
      message += `${referral.no_paid_orders_level2}\n`;
    }
    message += `\n${referral.points_earned}\n`;
    message += format(referral.points_level1, { points: s1.points }) + "\n";
    message += format(referral.points_level2, { points: s2.points }) + "\n";
    message += `\n<b>${format(referral.total_points, { points: totalPoints })}</b>\n`;
    message += `\n<b>${referral.conversion}</b>\n`;

    if (referrals.length > 0) {
      message += `\n${referral.invited_list}\n`;
      referrals.forEach((r, i) => {
        message += format(referral.invited_row, {
          n: i + 1,
          id: r.user_id,
          level: r.level,
          orders: r.total_orders || 0,
          points: r.commission || 0,
          date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'
        }) + "\n";
      });
    } else {
      message += `\n${referral.no_invited}`;
    }

    await ctx.replyWithHTML(message);
  } catch (err) {
    console.error('Ошибка при получении рефералов:', err);
    await ctx.reply('❌ Не удалось получить ваши рефералы. Попробуйте позже.');
  }
}; 