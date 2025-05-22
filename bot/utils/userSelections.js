const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../../data/userSelections.json');

function read() {
  if (!fs.existsSync(FILE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
  } catch (err) {
    console.error('❌ Սխալ JSON ընթերցման ժամանակ:', err.message);
    return {};
  }
}

function write(data) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Գրելիս սխալ:', err.message);
  }
}

module.exports = {
  /**
   * Վերադարձնում է կոնկրետ օգտատիրոջ ընտրությունները
   * @param {number} userId - Telegram ID
   */
  get: (userId) => {
    const all = read();
    return all[userId];
  },

  /**
   * Պահպանում է կոնկրետ օգտատիրոջ ընտրությունները
   * @param {number} userId - Telegram ID
   * @param {object} data - Օգտատիրոջ ընտրած ապրանքները, օրինակ՝ { uc: [], popularity: [], cars: [] }
   */
  set: (userId, data) => {
    const all = read();
    all[userId] = data;
    write(all);
  },

  /**
   * Ջնջում է օգտատիրոջ տվյալները
   * @param {number} userId - Telegram ID
   */
  delete: (userId) => {
    const all = read();
    delete all[userId];
    write(all);
  }
};
