const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../authMiddleware');

// GET / - ROTA ATUALIZADA (usa Pessoa)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    const sql = `
      SELECT 
        p.*,
        COALESCE(pf.nome_completo, pj.razao_social) AS nome_cliente
      FROM Processo p
      JOIN Pessoa c ON p.pessoa_id = c.pessoa_id
      LEFT JOIN PessoaFisica pf ON p.pessoa_id = pf.pessoa_id
      LEFT JOIN PessoaJuridica pj ON p.pessoa_id = pj.pessoa_id
      WHERE c.usuario_id = $1
      ORDER BY p.data_emissao DESC`;
    const { rows } = await db.query(sql, [usuario_id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar processos.' });
  }
});

// GET /:id - ROTA ATUALIZADA (usa Pessoa)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.usuario;
    const sql = `
      SELECT p.*,
      COALESCE(pf.nome_completo, pj.razao_social) AS nome_cliente
      FROM Processo p
      JOIN Pessoa c ON p.pessoa_id = c.pessoa_id
      LEFT JOIN PessoaFisica pf ON c.pessoa_id = pf.pessoa_id
      LEFT JOIN PessoaJuridica pj ON c.pessoa_id = pj.pessoa_id
      WHERE p.processo_id = $1 
        AND c.usuario_id = $2`;
    const { rows } = await db.query(sql, [id, usuario_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Processo não encontrado.' });
    }
    // Formata a data para YYYY-MM-DD
    if(rows[0].data_emissao) {
      rows[0].data_emissao = rows[0].data_emissao.toISOString().split('T')[0];
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar dados do processo.' });
  }
});

// POST / - ROTA ATUALIZADA (usa Pessoa)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // ***** A CORREÇÃO ESTÁ AQUI *****
    // Antes: const { cliente_id, ...dados } = req.body;
    // Agora:
    const { pessoa_id, numero_processo, titulo_caso, status_processo, data_emissao, valor } = req.body;
    const { usuario_id } = req.usuario;

    // Verificação de segurança (usa a tabela Pessoa)
    const checkSql = 'SELECT * FROM Pessoa WHERE pessoa_id = $1 AND usuario_id = $2';
    // Usa 'pessoa_id'
    const check = await db.query(checkSql, [pessoa_id, usuario_id]); 
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Permissão negada para este cliente.' });
    }

    const sql = `
      INSERT INTO Processo (pessoa_id, numero_processo, titulo_caso, status_processo, data_emissao, valor)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`;
    const params = [
      pessoa_id, // Usa 'pessoa_id'
      numero_processo, 
      titulo_caso,
      status_processo || 'Ativo', 
      data_emissao || null, 
      valor || null
    ];
    const { rows } = await db.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao cadastrar processo.' });
  }
});

// PUT /:id - ROTA ATUALIZADA (usa Pessoa)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.usuario;
    const { pessoa_id, numero_processo, titulo_caso, status_processo, data_emissao, valor } = req.body;

    const sql = `
      UPDATE Processo p
      SET pessoa_id = $1, numero_processo = $2, titulo_caso = $3, status_processo = $4, data_emissao = $5, valor = $6
      FROM Pessoa c
      WHERE p.pessoa_id = c.pessoa_id
        AND p.processo_id = $7
        AND c.usuario_id = $8
      RETURNING p.*`;
    const params = [pessoa_id, numero_processo, titulo_caso, status_processo, data_emissao || null, valor || null, id, usuario_id];
    const { rows } = await db.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Processo não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao atualizar processo.' });
  }
});

// DELETE /:id - ROTA ATUALIZADA (usa Pessoa)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.usuario;
    const sql = `
      DELETE FROM Processo p
      USING Pessoa c
      WHERE p.pessoa_id = c.pessoa_id
        AND p.processo_id = $1
        AND c.usuario_id = $2
      RETURNING p.*`;
    const { rows } = await db.query(sql, [id, usuario_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Processo não encontrado.' });
    }
    res.json({ message: 'Processo excluído com sucesso.' });
  } catch (err) {
    if (err.code === '23503') { 
      return res.status(409).json({ error: 'Não é possível excluir processo que possui parcelas ou documentos vinculados.' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao excluir processo.' });
  }
});

module.exports = router;