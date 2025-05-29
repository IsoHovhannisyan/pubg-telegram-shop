const { Pool } = require('pg');
require('dotenv').config();

console.log("🔧 Loaded DB_URL:", process.env.DB_URL);

let pool;
let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000; // 5 seconds

const createPool = () => {
  return new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
      rejectUnauthorized: false // Required for Supabase connections
    },
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 300000,
    max: 20,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  });
};

const initializePool = () => {
  pool = createPool();

  pool.on('error', async (err, client) => {
    console.error('❌ Database connection error:', err);
    await handleReconnect();
  });

  // Test initial connection
  return testConnection();
};

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to database');
    client.release();
    reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    await handleReconnect();
    return false;
  }
};

const handleReconnect = async () => {
  if (isReconnecting) return;
  
  isReconnecting = true;
  reconnectAttempts++;

  console.log(`🔄 Attempting to reconnect (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

  try {
    // Close existing pool if it exists
    if (pool) {
      await pool.end();
    }

    // Create new pool
    pool = createPool();
    
    // Test the new connection
    const connected = await testConnection();
    
    if (connected) {
      console.log('✅ Successfully reconnected to database');
      isReconnecting = false;
      return;
    }
  } catch (err) {
    console.error('❌ Reconnection attempt failed:', err);
  }

  isReconnecting = false;

  // If we haven't exceeded max attempts, try again
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    setTimeout(handleReconnect, RECONNECT_DELAY);
  } else {
    console.error('❌ Max reconnection attempts reached. Please check your database connection.');
    // Reset attempts after a longer delay and try again
    setTimeout(() => {
      reconnectAttempts = 0;
      handleReconnect();
    }, RECONNECT_DELAY * 5);
  }
};

// Keep-alive query function
const keepAlive = async () => {
  try {
    if (!pool) {
      console.log('⚠️ Pool not initialized, attempting to reconnect...');
      await handleReconnect();
      return;
    }
    await pool.query('SELECT 1');
    console.log('💚 Keep-alive query successful');
  } catch (err) {
    console.error('❌ Keep-alive query failed:', err);
    await handleReconnect();
  }
};

// Run keep-alive query every 5 minutes
setInterval(keepAlive, 300000);

// Add connection retry logic with exponential backoff
const query = async (text, params) => {
  let retries = 5;
  let delay = 1000;
  
  while (retries > 0) {
    try {
      if (!pool) {
        await handleReconnect();
      }
      const client = await pool.connect();
      try {
        return await client.query(text, params);
      } finally {
        client.release();
      }
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      
      console.log(`🔄 Retrying query... ${retries} attempts left. Waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

// Initialize the pool
initializePool().catch(err => {
  console.error('❌ Failed to initialize database connection:', err);
});

module.exports = {
  query,
  pool: () => pool, // Export a function to get the current pool
  testConnection
};
