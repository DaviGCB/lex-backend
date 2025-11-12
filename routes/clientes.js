const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../authMiddleware');

// GET / (Listar Todos - CORRIGIDO)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { usuario_id } = req.usuario;
    // SQL CORRIGIDO: une Pessoa com Física E Jurídica e traz todos os dados
    const sql = `
      SELECT 
        p.pessoa_id, p.email, p.telefone, p.cep, p.rua, p.num, p.complemento, p.bairro, p.cidade, p.estado, p.pais,
        COALESCE(pf.nome_completo, pj.razao_social) AS nome,
        COALESCE(pf.cpf, pj.cnpj) AS cpf_cnpj,
        pf.sexo, pf.data_nasc, pf.profissao, pf.nacionalidade, pf.estado_civil,
        pj.nome_fantasia,
        CASE 
          WHEN pf.pessoa_id IS NOT NULL THEN 'Física'
          WHEN pj.pessoa_id IS NOT NULL THEN 'Jurídica'
        END AS tipo_pessoa
      FROM Pessoa p
      LEFT JOIN PessoaFisica pf ON p.pessoa_id = pf.pessoa_id
      LEFT JOIN PessoaJuridica pj ON p.pessoa_id = pj.pessoa_id
      WHERE p.usuario_id = $1
      ORDER BY nome;
    `;
    const { rows } = await db.query(sql, [usuario_id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar clientes.' });
  }
});

// GET /:id (Buscar Um - CORRIGIDO)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.usuario;

    const pessoaSql = 'SELECT * FROM Pessoa WHERE pessoa_id = $1 AND usuario_id = $2';
    const pessoaRes = await db.query(pessoaSql, [id, usuario_id]);

    if (pessoaRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada.' });
    }
    
    const pfSql = 'SELECT * FROM PessoaFisica WHERE pessoa_id = $1';
    const pfRes = await db.query(pfSql, [id]);
    
    const pjSql = 'SELECT * FROM PessoaJuridica WHERE pessoa_id = $1';
    const pjRes = await db.query(pjSql, [id]);

    // Formata a data de nascimento para YYYY-MM-DD
    let dataNascFormatada = {};
    if (pfRes.rows.length > 0 && pfRes.rows[0].data_nasc) {
        dataNascFormatada = { data_nasc: pfRes.rows[0].data_nasc.toISOString().split('T')[0] };
    }

    const cliente = {
      ...pessoaRes.rows[0],
      ...(pfRes.rows.length > 0 ? { tipo: 'fisica', ...pfRes.rows[0], ...dataNascFormatada } : {}),
      ...(pjRes.rows.length > 0 ? { tipo: 'juridica', ...pjRes.rows[0] } : {}),
    };

    res.json(cliente);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar dados do cliente.' });
  }
});

// POST / (Cadastrar - CORRIGIDO)
router.post('/', authMiddleware, async (req, res) => {
  const { tipo_pessoa, ...dados } = req.body;
  const { usuario_id } = req.usuario;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const pessoaSql = `
      INSERT INTO Pessoa (usuario_id, email, telefone, cep, rua, num, complemento, bairro, cidade, estado, pais)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING pessoa_id`;
    const pessoaParams = [
      usuario_id, dados.email, dados.telefone, dados.cep, dados.rua, dados.num, 
      dados.complemento, dados.bairro, dados.cidade, dados.estado, dados.pais
    ];
    const pessoaRes = await client.query(pessoaSql, pessoaParams);
    const newPessoaId = pessoaRes.rows[0].pessoa_id;

    if (tipo_pessoa === 'fisica') {
      const pfSql = `
        INSERT INTO PessoaFisica (pessoa_id, nome_completo, cpf, sexo, data_nasc, profissao, nacionalidade, estado_civil)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
      const pfParams = [
        newPessoaId, dados.nome_completo, dados.cpf, dados.sexo, dados.data_nasc || null,
        dados.profissao, dados.nacionalidade, dados.estado_civil
      ];
      await client.query(pfSql, pfParams);
    } else if (tipo_pessoa === 'juridica') {
      const pjSql = `
        INSERT INTO PessoaJuridica (pessoa_id, cnpj, razao_social, nome_fantasia)
        VALUES ($1, $2, $3, $4)`;
      const pjParams = [newPessoaId, dados.cnpj, dados.razao_social, dados.nome_fantasia];
      await client.query(pjSql, pjParams);
    } else {
      throw new Error('Tipo de pessoa inválido.');
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Cliente cadastrado com sucesso!', pessoa_id: newPessoaId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar cliente.' });
  } finally {
    client.release();
  }
});

// PUT /:id (Editar - CORRIGIDO)
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { tipo, ...dados } = req.body;
  const { usuario_id } = req.usuario;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Atualiza a tabela 'Pessoa'
    const pessoaSql = `
      UPDATE Pessoa SET email=$1, telefone=$2, cep=$3, rua=$4, num=$5, complemento=$6, bairro=$7, cidade=$8, estado=$9, pais=$10
      WHERE pessoa_id = $11 AND usuario_id = $12`;
    const pessoaParams = [
      dados.email, dados.telefone, dados.cep, dados.rua, dados.num, dados.complemento, 
      dados.bairro, dados.cidade, dados.estado, dados.pais, id, usuario_id
    ];
    await client.query(pessoaSql, pessoaParams);

    // 2. Atualiza a tabela Específica
    if (tipo === 'fisica') {
      const pfSql = `
        UPDATE PessoaFisica 
        SET nome_completo=$1, cpf=$2, sexo=$3, data_nasc=$4, profissao=$5, nacionalidade=$6, estado_civil=$7
        WHERE pessoa_id = $8`;
      const pfParams = [
        dados.nome_completo, dados.cpf, dados.sexo, dados.data_nasc || null,
        dados.profissao, dados.nacionalidade, dados.estado_civil, id
      ];
      await client.query(pfSql, pfParams);
    } else if (tipo === 'juridica') {
      const pjSql = `
        UPDATE PessoaJuridica 
        SET cnpj=$1, razao_social=$2, nome_fantasia=$3
        WHERE pessoa_id = $4`;
      const pjParams = [dados.cnpj, dados.razao_social, dados.nome_fantasia, id];
      await client.query(pjSql, pjParams);
    }

    await client.query('COMMIT');
    res.json({ message: 'Cliente atualizado com sucesso!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  } finally {
    client.release();
  }
});

// DELETE /:id (Excluir - CORRIGIDO)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.usuario;

    // O ON DELETE CASCADE no SQL cuida de apagar PessoaFisica/Juridica
    const sql = 'DELETE FROM Pessoa WHERE pessoa_id = $1 AND usuario_id = $2 RETURNING *';
    const { rows } = await db.query(sql, [id, usuario_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    res.json({ message: 'Cliente excluído com sucesso.' });
  } catch (err) {
    if (err.code === '23503') { 
      return res.status(409).json({ error: 'Não é possível excluir cliente que possui processos vinculados.' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
});

module.exports = router;