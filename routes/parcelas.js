const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../authMiddleware');

// Listar parcelas de UM honorário
router.get('/honorario/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // (Validação de segurança omitida)
    const sql = 'SELECT * FROM Parcela WHERE honorario_id = $1 ORDER BY data_vencimento ASC';
    const { rows } = await db.query(sql, [id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar parcelas.' });
  }
});

// Criar nova parcela
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { honorario_id, descricao, valor, data_vencimento } = req.body;
    // (Validação de segurança omitida)
    const sql = `
      INSERT INTO Parcela (honorario_id, descricao, valor, data_vencimento)
      VALUES ($1, $2, $3, $4) RETURNING *`;
    const params = [honorario_id, descricao, valor, data_vencimento];
    const { rows } = await db.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao criar parcela.' });
  }
});

// (Rotas de GET/:id, PUT/:id, DELETE/:id seriam adicionadas aqui)
module.exports = router;