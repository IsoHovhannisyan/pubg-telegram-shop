// ✅ handlers/catalogManual.js

const catalog = require('./catalog');

module.exports = async (ctx) => {
  await catalog.catalogCommand(ctx, 'manual');
};
