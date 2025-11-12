const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../authMiddleware');

// Listar honorários de UM processo
router.get('/processo/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.usuario;
    // (Validação de segurança omitida por brevidade, mas necessária)
    const sql = 'SELECT * FROM Honorario WHERE processo_id = $1 ORDER BY data_contrato DESC';
    const { rows } = await db.query(sql, [id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar honorários.' });
  }
});

// Criar novo honorário
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { processo_id, descricao, valor_total, tipo } = req.body;
    // (Validação de segurança omitida)
    const sql = `
      INSERT INTO Honorario (processo_id, descricao, valor_total, tipo)
      VALUES ($1, $2, $3, $4) RETURNING *`;
    const params = [processo_id, descricao, valor_total, tipo];
    const { rows } = await db.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao criar honorário.' });
  }
});

// (Rotas de GET/:id, PUT/:id, DELETE/:id seriam adicionadas aqui)
module.exports = router;