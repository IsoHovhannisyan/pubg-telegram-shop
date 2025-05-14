// db/connect.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false, // Supabase uses self-signed cert
  },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
