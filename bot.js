const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
dotenv.config();

const startHandler = require('./handlers/start');
const catalogHandler = require('./handlers/catalog');
const cartHandler = require('./handlers/cart');
const orderHandler = require('./handlers/orders');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Հանդլերներ
bot.start(startHandler);
bot.command('catalog', catalogHandler);
bot.command('cart', cartHandler);
bot.command('orders', orderHandler);

// Bot run
bot.launch();
console.log("✅ Бот запущен...");
