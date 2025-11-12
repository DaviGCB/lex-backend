const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../authMiddleware');

// GET /templates
router.get('/templates', authMiddleware, (req, res) => {
  const templatesDisponiveis = [
    { nome: 'Procuracao', descricao: 'Procuração Ad Judicia' },
    { nome: 'ContratoHonorarios', descricao: 'Contrato de Honorários' },
    { nome: 'DeclaracaoPobreza', descricao: 'Declaração de Hipossuficiência' },
  ];
  res.json(templatesDisponiveis);
});

// GET /processo/:id (Listar docs de um processo)
router.get('/processo/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.usuario;
    // (Validação de segurança)
    const checkSql = `
      SELECT p.* FROM Processo p
      JOIN Pessoa c ON p.pessoa_id = c.pessoa_id
      WHERE p.processo_id = $1 AND c.usuario_id = $2`;
    const check = await db.query(checkSql, [id, usuario_id]);
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Processo não encontrado.' });
    }
    // Retorna SÓ os metadados (sem o conteúdo)
    const sql = 'SELECT documento_id, nome_template, data_geracao FROM DocumentoGerado WHERE processo_id = $1';
    const { rows } = await db.query(sql, [id]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar documentos.' });
  }
});

// ***** ROTA NOVA (GET /:id) *****
// Busca um documento ÚNICO (com seu conteúdo) para baixar
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params; // ID do Documento
    const { usuario_id } = req.usuario;

    // Validação de segurança (O doc pertence a um processo do usuário?)
    const sql = `
      SELECT d.* FROM DocumentoGerado d
      JOIN Processo p ON d.processo_id = p.processo_id
      JOIN Pessoa c ON p.pessoa_id = c.pessoa_id
      WHERE d.documento_id = $1 AND c.usuario_id = $2`;
    
    const { rows } = await db.query(sql, [id, usuario_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }
    res.json(rows[0]); // Retorna o documento completo
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar documento.' });
  }
});


// POST /gerar
router.post('/gerar', authMiddleware, async (req, res) => {
  try {
    const { processo_id, nome_template } = req.body;
    const { usuario_id } = req.usuario;
    if (!processo_id || !nome_template) {
      return res.status(400).json({ error: 'Campos obrigatórios.' });
    }
    // (Lógica de busca de dados)
    const dadosSql = `
      SELECT 
        pr.*, c.*, 
        pf.nome_completo, pf.cpf, pf.sexo, pf.data_nasc, pf.profissao, pf.nacionalidade, pf.estado_civil,
        pj.cnpj, pj.razao_social, pj.nome_fantasia,
        u.nome_completo as nome_advogado
      FROM Processo pr
      JOIN Pessoa c ON pr.pessoa_id = c.pessoa_id
      JOIN Usuario u ON c.usuario_id = u.usuario_id
      LEFT JOIN PessoaFisica pf ON c.pessoa_id = pf.pessoa_id
      LEFT JOIN PessoaJuridica pj ON c.pessoa_id = pj.pessoa_id
      WHERE pr.processo_id = $1 AND c.usuario_id = $2`;
    const dadosQuery = await db.query(dadosSql, [processo_id, usuario_id]);
    if (dadosQuery.rows.length === 0) {
      return res.status(403).json({ error: 'Permissão negada para este processo.' });
    }
    const dados = dadosQuery.rows[0];
    let conteudo_gerado = '';
    const nomeCliente = dados.nome_completo || dados.razao_social;
    const docCliente = dados.cpf || dados.cnpj;

    // (Lógica de Geração dos templates)
    switch (nome_template) {
      case 'Procuracao':
        conteudo_gerado = `
PROCURAÇÃO AD JUDICIA

OUTORGANTE: ${nomeCliente.toUpperCase()}, portador(a) do CPF/CNPJ nº ${docCliente}, residente e domiciliado(a) em ${dados.rua || ''}, ${dados.num || ''}, ${dados.bairro || ''}, ${dados.cidade || ''}.

OUTORGADO(A): Dr(a). ${dados.nome_advogado.toUpperCase()}, advogado(a) inscrito(a) na OAB...

... pelo presente instrumento, nomeia e constitui seu(ua) procurador(a) o(a) outorgado(a)...
        `;
        break;
      case 'ContratoHonorarios':
        conteudo_gerado = `
CONTRATO DE HONORÁRIOS ADVOCATÍCIOS

CONTRATANTE: ${nomeCliente.toUpperCase()}, CPF/CNPJ nº ${docCliente}.

CONTRATADO(A): Dr(a). ${dados.nome_advogado.toUpperCase()}, advogado(a)...

CLÁUSULA 1ª: O objeto do presente contrato é a prestação de serviços advocatícios para a ação ${dados.titulo_caso || '[TÍTULO DO CASO]'} (Processo nº ${dados.numero_processo || '[N/A]'}).
...
        `;
        break;
      default:
        return res.status(400).json({ error: 'Template desconhecido.' });
    }

    const salvarSql = `
      INSERT INTO DocumentoGerado (processo_id, nome_template, conteudo_gerado)
      VALUES ($1, $2, $3)
      RETURNING *`;
    const { rows } = await db.query(salvarSql, [processo_id, nome_template, conteudo_gerado]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao gerar documento.' });
  }
});

module.exports = router;