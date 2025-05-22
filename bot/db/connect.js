const { Pool } = require('pg');
require('dotenv').config();

console.log("🔧 Loaded DB_URL:", process.env.DB_URL);

let pool = createPool();

function createPool() {
  return new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

async function query(text, params, retry = true) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('❌ Query error:', err.message);

    // Եթե կապի խնդիր է՝ նորից փորձի մեկ անգամ
    if (retry && isConnectionError(err)) {
      console.warn('🔄 Reconnecting to database...');
      pool.end(); // փակում ենք հին կապը
      pool = createPool(); // ստեղծում ենք նոր pool
      return query(text, params, false); // նորից փորձում ենք հարցումը
    }

    throw err;
  }
}

function isConnectionError(err) {
  return (
    err.code === 'ECONNRESET' ||
    err.code === 'ECONNREFUSED' ||
    err.message.includes('Connection terminated unexpectedly') ||
    err.message.includes('server closed the connection unexpectedly')
  );
}

module.exports = {
  query,
  pool: () => pool,
};
