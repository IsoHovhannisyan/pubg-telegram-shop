const axios = require('axios');
require('dotenv').config();
const { Markup } = require('telegraf');

const generateFreekassaLink = require('../utils/freekassaLink');

const MANAGER_IDS = process.env.MANAGER_CHAT_ID ? process.env.MANAGER_CHAT_ID.split(',') : [];
const API_URL = process.env.API_URL || 'http://localhost:3001';
const API_TOKEN = process.env.ADMIN_API_TOKEN;

// Add axios instance with default headers
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

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

  try {
    const res = await api.get('/admin/products', {
      params: { ids: ids.join(',') }
    });
    
    const categoryMap = {};
    res.data.forEach(row => {
      categoryMap[row.id] = row.category;
    });

    return items.map(i => {
      const parsedId = parseInt(i.id);
      return {
        ...i,
        category: !isNaN(parsedId) ? (categoryMap[parsedId] || 'Без категории') : 'Без категории'
      };
    });
  } catch (err) {
    console.error('Error fetching product categories:', err);
    return items;
  }
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

  // Defensive check: if any item requires a PUBG ID, and pubgId is missing/invalid, show error and do not insert
  const needsPubgId = items.some(i => i.type === 'auto' || i.type === 'manual');
  if (needsPubgId && (!pubgId || typeof pubgId !== 'string' || !/^\d{5,20}$/.test(pubgId))) {
    await ctx.reply('❌ Для этого заказа требуется корректный PUBG ID. Пожалуйста, начните заказ заново и введите правильный ID.');
    return;
  }

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

  try {
    // Generate a unique checkout_id for this cart/checkout
    const checkoutId = Date.now() + '-' + userId;
    // Register orders through admin panel API
    let autoOrder = null;
    let manualOrder = null;
    if (manualItems.length > 0) {
      const res = await api.post('/admin/orders', {
        user_id: userId,
        pubg_id: pubgId,
        products: manualItems,
        time: createdAt,
        status: 'unpaid',
        nickname: nickname,
        checkout_id: checkoutId
      });
      manualOrder = res.data;
      console.log('✅ Manual order registered as unpaid');
    }

    if (autoItems.length > 0) {
      const res = await api.post('/admin/orders', {
        user_id: userId,
        pubg_id: pubgId,
        products: autoItems,
        time: createdAt,
        status: 'unpaid',
        nickname: nickname,
        checkout_id: checkoutId
      });
      autoOrder = res.data;
      console.log('✅ Auto order registered as unpaid');
    }

    // 🌟 Build final message
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

    // Add auto-activated products to the message
    if (autoItems.length > 0) {
      const ucList = autoItems.map(i => `• ${i.title || i.name} x${i.qty} — ${i.price * i.qty} ₽`).join('\n');
      finalMessage += `💳 <b>Авто-доставка (UC):</b>\n${ucList}\n`;
      finalMessage += `💰 <b>Сумма:</b> ${autoSum} ₽\n`;
    }

    // Add manual products to the message
    if (manualItems.length > 0) {
      const manualList = manualItems.map(i => `• ${i.title || i.name} x${i.qty} — ${i.price * i.qty} ₽`).join('\n');
      finalMessage += `🧍 <b>Ручная доставка:</b>\n${manualList}\n`;
      finalMessage += `👉 После оплаты с вами свяжется менеджер\n`;
    }

    // If both auto and manual products are present, add an explanation message
    if (autoItems.length > 0 && manualItems.length > 0) {
      finalMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
      finalMessage += `ℹ️ <b>Внимание!</b>\n`;
      finalMessage += `В ваш заказ входят товары с разными способами доставки:\n`;
      finalMessage += `• <b>Автоматическая доставка</b> — UC будут зачислены на ваш аккаунт сразу после оплаты.\n`;
      finalMessage += `• <b>Ручная доставка</b> — после оплаты менеджер свяжется с вами для передачи остальных товаров.\n`;
    }

    // Determine the payment URL based on the order type
    let payUrl;
    if (autoItems.length > 0 && autoOrder) {
      payUrl = `https://pubg-telegram-shop.vercel.app/payment/${autoOrder.id}?amount=${fullSum}`;
    } else if (manualItems.length > 0 && manualOrder) {
      payUrl = `https://pubg-telegram-shop.vercel.app/payment/${manualOrder.id}?amount=${fullSum}`;
    }

    // Send the unified message with payment button if applicable
    if (payUrl) {
      await ctx.replyWithHTML(
        finalMessage + 'Для оплаты нажмите на кнопку ниже:',
        Markup.inlineKeyboard([
          [Markup.button.url('💳 Оплатить', payUrl)]
        ])
      );
    } else {
      await ctx.replyWithHTML(finalMessage);
    }
  } catch (err) {
    console.error('Error registering order:', err);
    await ctx.reply('❌ Произошла ошибка при оформлении заказа. Пожалуйста, попробуйте позже.');
  }
}

module.exports = registerOrder;
