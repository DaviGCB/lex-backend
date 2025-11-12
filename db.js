/// Arquivo: lex-backend/db.js (CORRIGIDO)

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Exporta as duas funções que precisamos:
// query: Para consultas simples
// connect: Para transações complexas
module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(), // <-- A LINHA QUE FALTAVA
};