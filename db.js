require('dotenv').config();
const { Pool } = require('pg');

// Configuração da Pool com a opção de SSL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  
  // --- A LINHA QUE FALTAVA ---
  // Exige que a conexão use SSL (necessário para Supabase, Render, etc.)
  ssl: {
    rejectUnauthorized: false
  }
});

// Exporta as duas funções que precisamos
module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};