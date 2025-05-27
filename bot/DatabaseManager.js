const { Pool } = require('pg');

class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
  }

  async connect() {
    try {
      this.pool = new Pool(this.config);
      
      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        this.handlePoolError();
      });

      // Test the connection
      const client = await this.pool.connect();
      client.release();
      console.log('✅ Database connection established');
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      return this.pool;
    } catch (err) {
      console.error('❌ Database connection error:', err);
      return this.handleConnectionError();
    }
  }

  async handleConnectionError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      // Wait before attempting to reconnect
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
      
      // Try to reconnect
      return this.connect();
    } else {
      console.error('❌ Max reconnection attempts reached. Please check your database connection.');
      // Don't throw, just return null to allow the application to continue running
      return null;
    }
  }

  async handlePoolError() {
    console.log('🔄 Pool error detected, attempting to reconnect...');
    if (this.pool) {
      try {
        await this.pool.end();
      } catch (err) {
        console.error('Error closing pool:', err);
      }
    }
    this.pool = null;
    return this.connect();
  }

  async query(text, params) {
    if (!this.pool) {
      await this.connect();
    }

    try {
      return await this.pool.query(text, params);
    } catch (err) {
      console.error('Query error:', err);
      if (err.code === 'XX000' || err.code === '08006' || err.code === '08001') {
        // Database connection errors
        await this.handlePoolError();
        // Retry the query once
        return this.pool.query(text, params);
      }
      throw err;
    }
  }
}

module.exports = DatabaseManager; 