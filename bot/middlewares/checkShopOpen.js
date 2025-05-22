const getShopStatus = require("../utils/getShopStatus");

const checkShopOpen = async (ctx, next) => {
  const status = await getShopStatus();

  if (!status.shop_open) {
    return ctx.reply(status.shop_closed_message || "🛠 Магазин временно закрыт.");
  }

  ctx.state.shopStatus = status; // պահիր, եթե պետք լինի հետո
  return next();
};

module.exports = checkShopOpen;