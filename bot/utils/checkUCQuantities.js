function checkUCQuantities(ucItems = [], availableMap = {}, lang) {
    const insufficient = [];
  
    for (const item of ucItems) {
      const requestedQty = item.qty || 1;
      const availableQty = availableMap[item.id] || 0;
  
      if (availableQty === 0) {
        insufficient.push(lang.catalog.uc_unavailable.replace('{title}', item.title));
      } else if (requestedQty > availableQty) {
        insufficient.push(
          lang.catalog.uc_partial
            .replace('{title}', item.title)
            .replace('{have}', availableQty)
            .replace('{want}', requestedQty)
        );
      }
    }
  
    return insufficient;
  }
  
  module.exports = checkUCQuantities;
  