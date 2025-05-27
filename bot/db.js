const { Pool } = require('pg');
const DatabaseManager = require('./DatabaseManager');

// Create and export a singleton instance
const dbManager = new DatabaseManager({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = dbManager; 