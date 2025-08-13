// backend/config/database.js
const { Pool } = require('pg');
require('dotenv').config(); // เพิ่มเข้ามาเพื่อให้แน่ใจว่าไฟล์ .env ถูกโหลด

// Database connection configuration
const dbConfig = {
  host: process.env.DB_POSTGRESDB_HOST || 'localhost',
  port: process.env.DB_POSTGRESDB_PORT || 5433,
  database: process.env.DB_POSTGRESDB_DATABASE || 'n8n',
  user: process.env.DB_POSTGRESDB_USER || 'admin',
  password: process.env.DB_POSTGRESDB_PASSWORD || 'P@ssw0rd',

  min: 2,
  max: 10,
  idleTimeoutMillis: 60000, // Increased from 30 seconds to 60 seconds
  connectionTimeoutMillis: 10000, // Increased from 2 seconds to 10 seconds

  ssl: process.env.DB_SSL === 'true' // ตั้งค่า SSL จาก .env
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test connection and set datestyle
pool.on('connect', (client) => {
  // ตั้งค่า datestyle สำหรับ session เพื่อให้ PostgreSQL ตีความรูปแบบวันที่ DD/MM/YYYY ได้ถูกต้อง
  client.query("SET datestyle = 'ISO, DMY';")
    .catch(err => console.error('❌ Failed to set datestyle on connect:', err));
});

pool.on('error', (err) => {
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    throw error;
  }
};

// Helper function to get client from pool
const getClient = async () => {
  const client = await pool.connect();
  // ตั้งค่า datestyle สำหรับ client ที่ได้จาก pool โดยตรงด้วย
  await client.query("SET datestyle = 'ISO, DMY';")
    .catch(err => console.error('❌ Failed to set datestyle for direct client:', err));
  return client;
};

// Graceful shutdown
process.on('SIGINT', () => {
  pool.end(() => {
    process.exit(0);
  });
});


module.exports = {
  pool,
  query,
  getClient
};
