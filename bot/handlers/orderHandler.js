const db = require('../db/connect');
require('dotenv').config();

const generateFreekassaLink = require('../utils/freekassaLink');

const MANAGER_IDS = process.env.MANAGER_CHAT_ID ? process.env.MANAGER_CHAT_ID.split(',') : [];

function formatItems(items) {
  return items.map(i => `▫️ ${i.title || i.name} x${i.qty} — ${i.price * i.qty} ₽`).join('\n');
}

function getTotal(items) {
  return items.reduce((sum, i) => sum + (i.price * i.qty), 0);
}

function buildManagerMessage(ctx, pubgId, manualItems, nickname) {
  const userId = ctx.from.id;
  const userTag = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

  let message = `🎞️ Новый Мануальный заказ\n\n`;
  message += `👤 Пользователь: ${userTag} (${userId})\n`;
  message += `🎮 PUBG ID: ${pubgId}\n`;
  if (nickname) {
    message += `👑 Никнейм: ${nickname}\n`;
  }

  message += `\n📦 Мануальные товары:\n${formatItems(manualItems)}\n`;
  message += `💰 Сумма: ${getTotal(manualItems)} ₽\n`;

  return message;
}

async function getProductCategories(items) {
  const ids = items
    .map(i => parseInt(i.id))
    .filter(id => !isNaN(id));

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

function getStatusLabel(status) {
  switch (status) {
    case 'unpaid':
      return 'Неоплачен';
    case 'pending':
      return 'В обработке';
    case 'manual_processing':
      return 'Ожидает менеджера';
    case 'delivered':
      return 'Доставлен';
    case 'error':
      return 'Ошибка';
    default:
      return status;
  }
}

async function registerOrder(ctx, pubgId, items, nickname) {
  const userId = ctx.from.id;
  const createdAt = new Date();

  const categorizedItems = await getProductCategories(items);

  const autoItems = categorizedItems.filter(
    i => i.type === 'auto' && i.category === 'uc_by_id'
  );

  const manualItems = categorizedItems.filter(
    i => !(i.type === 'auto' && i.category === 'uc_by_id')
  );

  console.log("🧾 INSERT DATA:");
  console.log("UserID:", userId);
  console.log("PUBG ID:", pubgId);
  console.log("Nickname:", nickname);
  console.log("Manual Items:", manualItems.length);
  console.log("Auto Items:", autoItems.length);

  // Գրանցում բազայում
  if (manualItems.length > 0) {
    await db.query(
      `INSERT INTO orders (user_id, pubg_id, products, time, status, nickname)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, pubgId, JSON.stringify(manualItems), createdAt, 'manual_processing', nickname]
    );
    console.log('✅ Մանուալ պատվերը գրանցված է');
  }

  if (autoItems.length > 0) {
    await db.query(
      `INSERT INTO orders (user_id, pubg_id, products, time, status, nickname)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, pubgId, JSON.stringify(autoItems), createdAt, 'unpaid', nickname]
    );
    console.log('✅ Ավտոմատ պատվերը գրանցված է որպես unpaid');
  }

  // 🌟 Կառուցում ենք գեղեցիկ, հասկանալի վերջնական հաղորդագրություն
  let finalMessage = `✅ <b>Ваш заказ успешно оформлен!</b>\n\n`;
  finalMessage += `🎮 <b>PUBG ID:</b> <code>${pubgId}</code>\n`;
    if (nickname) {
      finalMessage += `👤 <b>Никнейм:</b> ${nickname}\n`;
    }

    const autoSum = autoItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const manualSum = manualItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const fullSum = autoSum + manualSum;

    finalMessage += `💵 <b>ОБЩАЯ СУММА:</b> <u>${fullSum} ₽</u>\n`;
    finalMessage += `━━━━━━━━━━━━━━━━━━━━\n`;

  if (autoItems.length > 0) {
    const ucSum = getTotal(autoItems);
    const ucList = autoItems.map(i => `• ${i.title || i.name} x${i.qty} — ${i.price * i.qty} ₽`).join('\n');
    const paymentPurpose = `PUBG ${pubgId} (${nickname}) • ${autoItems.map(i => i.title).join(', ')}`;
    const payUrl = generateFreekassaLink(ctx.from.id, ucSum, paymentPurpose);

    finalMessage += `💳 <b>Авто-доставка (UC):</b>\n${ucList}\n`;
    finalMessage += `💰 <b>Сумма:</b> ${ucSum} ₽\n`;
    finalMessage += `📦 <b>Статус:</b> ${getStatusLabel('unpaid')}\n`;
    finalMessage += `🔗 <b>Оплатите заказ по ссылке:</b>\n${payUrl}\n`;
    finalMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
  }

  if (manualItems.length > 0) {
  const manualList = manualItems.map(i => `• ${i.title || i.name} x${i.qty} — ${i.price * i.qty} ₽`).join('\n');
  const manualSum = manualItems.reduce((sum, i) => sum + (i.price * i.qty), 0);

  finalMessage += `🧍 <b>Ручная доставка:</b>\n${manualList}\n`;
  finalMessage += `💰 <b>Сумма:</b> ${manualSum} ₽\n`;
  finalMessage += `📦 <b>Статус:</b> ${getStatusLabel('manual_processing')}\n`;
  finalMessage += `📞 <i>Менеджер скоро свяжется с вами в Telegram</i>\n`;
}


  // Ուղարկել ընդամենը 1 գեղեցիկ հաղորդագրություն
  await ctx.replyWithHTML(finalMessage);

  // Ուղարկել մենեջերին, եթե պետք է
  if (manualItems.length > 0) {
    const message = buildManagerMessage(ctx, pubgId, manualItems, nickname);
    for (const managerId of MANAGER_IDS) {
      try {
        await ctx.telegram.sendMessage(managerId, message);
      } catch (err) {
        console.error(`❌ Չհաջողվեց ուղարկել մենեջերին (${managerId})`, err.message);
      }
    }
  }
}




module.exports = registerOrder;







