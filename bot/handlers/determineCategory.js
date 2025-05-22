function determineCategory(items) {
  const allIds = items.map(i => i.id || '');

  const isUC = allIds.every(id => id.startsWith('uc_'));
  const isPopularity = allIds.every(id => id.startsWith('pop_'));
  const isCar = allIds.every(id => id.startsWith('car_'));
  const isCostume = allIds.every(id => id.startsWith('xskin_'));

  const allAuto = items.every(i => i.type === 'auto');
  const allManual = items.every(i => i.type === 'manual');

  if (isUC && allAuto) return 'uc';
  if (isUC && allManual) return 'uc_by_id';
  if (isPopularity) return 'popularity';
  if (isCar) return 'car';
  if (isCostume) return 'costume';

  return 'other';
}

module.exports = determineCategory;

