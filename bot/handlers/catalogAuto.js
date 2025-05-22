// ✅ handlers/catalogAuto.js

const catalog = require('./catalog');

module.exports = async (ctx) => {
  await catalog.catalogCommand(ctx, 'auto');
};
