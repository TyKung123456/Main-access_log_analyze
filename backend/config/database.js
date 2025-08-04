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
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,

  ssl: process.env.DB_SSL === 'true' // ตั้งค่า SSL จาก .env
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test connection and set datestyle
pool.on('connect', (client) => {
  console.log('✅ Connected to PostgreSQL database');
  // ตั้งค่า datestyle สำหรับ session เพื่อให้ PostgreSQL ตีความรูปแบบวันที่ DD/MM/YYYY ได้ถูกต้อง
  client.query("SET datestyle = 'ISO, DMY';")
    .then(() => console.log('✅ PostgreSQL datestyle set to DMY for new connection'))
    .catch(err => console.error('❌ Failed to set datestyle on connect:', err));
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { duration, rows: res.rowCount });
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('Database query error', { duration, error: error.message });
    throw error;
  }
};

// Helper function to get client from pool
const getClient = async () => {
  const client = await pool.connect();
  // ตั้งค่า datestyle สำหรับ client ที่ได้จาก pool โดยตรงด้วย
  await client.query("SET datestyle = 'ISO, DMY';")
    .then(() => console.log('✅ PostgreSQL datestyle set to DMY for direct client'))
    .catch(err => console.error('❌ Failed to set datestyle for direct client:', err));
  return client;
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Closing database connections...');
  pool.end(() => {
    console.log('✅ Database connections closed');
    process.exit(0);
  });
});


module.exports = {
  pool,
  query,
  getClient
};