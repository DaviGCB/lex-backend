const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../authMiddleware');

// Listar pagamentos de UMA parcela
router.get('/parcela/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // (Validação de segurança omitida)
    const sql = 'SELECT * FROM Pagamento WHERE parcela_id = $1 ORDER BY data_pagamento ASC';
    const { rows } = await db.query(sql, [id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
  }
});

// Registrar novo pagamento
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { parcela_id, valor_pago, data_pagamento, tipo_pagamento } = req.body;
    // (Validação de segurança omitida)
    const sql = `
      INSERT INTO Pagamento (parcela_id, valor_pago, data_pagamento, tipo_pagamento)
      VALUES ($1, $2, $3, $4) RETURNING *`;
    const params = [parcela_id, valor_pago, data_pagamento, tipo_pagamento];
    const { rows } = await db.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao registrar pagamento.' });
  }
});

// (Rotas de GET/:id, PUT/:id, DELETE/:id seriam adicionadas aqui)
module.exports = router;