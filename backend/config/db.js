const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  // Eğer Docker içindeysek environment variable'ı kullan, yoksa 'postgres' kullan
  user: process.env.DB_USER || 'postgres',
  
  // BURASI KRİTİK: Docker Compose 'DB_HOST'u 'db' olarak verir. 
  // Localde çalışırken undefined olacağı için 'localhost'a düşer.
  host: process.env.DB_HOST || 'localhost',
  
  database: process.env.DB_NAME || 'securechat',
  password: process.env.DB_PASSWORD || '147258', // .env dosyanla uyumlu şifre
  port: process.env.DB_PORT || 5432,
});

module.exports = pool;