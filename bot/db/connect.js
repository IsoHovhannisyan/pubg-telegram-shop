const { Pool } = require('pg');
require('dotenv').config();

console.log("🔧 Loaded DB_URL:", process.env.DB_URL);

let pool = createPool();
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 5000; // 5 seconds

function createPool() {
  return new Pool({
    connectionString: process.env.DB_URL,
    max: 2, // Limit pool size for free-tier DB
    ssl: {
      rejectUnauthorized: false,
    },
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Wait 2 seconds for connection
  });
}

async function handlePoolError() {
  console.log('🔄 Pool error detected, attempting to reconnect...');
  if (pool) {
    try {
      await pool.end();
    } catch (err) {
      console.error('Error closing pool:', err);
    }
  }
  pool = null;
  return reconnect();
}

async function reconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('❌ Max reconnection attempts reached. Please check your database connection.');
    return null;
  }

  reconnectAttempts++;
  console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
  
  // Wait before attempting to reconnect
  await new Promise(resolve => setTimeout(resolve, reconnectDelay));
  
  try {
    pool = createPool();
    // Test the connection
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connection reestablished');
    reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    return pool;
  } catch (err) {
    console.error('❌ Reconnection failed:', err.message);
    return reconnect();
  }
}

async function query(text, params, retry = true) {
  try {
    if (!pool) {
      await reconnect();
    }
    return await pool.query(text, params);
  } catch (err) {
    console.error('❌ Query error:', err.message);

    if (retry && isConnectionError(err)) {
      console.warn('🔄 Reconnecting to database...');
      await handlePoolError();
      return query(text, params, false); // Try query one more time
    }

    throw err;
  }
}

function isConnectionError(err) {
  return (
    err.code === 'ECONNRESET' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'XX000' ||
    err.code === '08006' ||
    err.code === '08001' ||
    err.message.includes('Connection terminated unexpectedly') ||
    err.message.includes('server closed the connection unexpectedly')
  );
}

// Handle pool errors
pool.on('error', async (err) => {
  console.error('Unexpected error on idle client', err);
  await handlePoolError();
});

module.exports = {
  query,
  pool: () => pool,
};
