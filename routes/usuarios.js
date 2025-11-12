const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs'); // Para criptografar senhas
const jwt = require('jsonwebtoken'); // Para criar o token de login

// Chave secreta para o JWT. Em um projeto real, coloque isso no .env!
const JWT_SECRET = 'sua-chave-secreta-muito-forte-12345';

// REQUISITO 1: "O sistema deve permitir o cadastro de novo usuário"
// Rota: [POST] /api/usuarios/registrar
router.post('/registrar', async (req, res) => {
  try {
    const { nome_completo, email, senha } = req.body;
    if (!nome_completo || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // 1. Criptografar a senha
    const salt = await bcrypt.genSalt(10); // Gera um "tempero" para a senha
    const senha_hash = await bcrypt.hash(senha, salt); // A senha criptografada

    // 2. Salvar o usuário no banco (com a senha criptografada)
    const sql = `
      INSERT INTO Usuario (nome_completo, email, senha_hash)
      VALUES ($1, $2, $3)
      RETURNING usuario_id, nome_completo, email`;
    
    const { rows } = await db.query(sql, [nome_completo, email, senha_hash]);

    res.status(201).json(rows[0]);

  } catch (err) {
    if (err.code === '23505') { // Erro de e-mail duplicado
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});


// LOGIN DE USUÁRIO
// Rota: [POST] /api/usuarios/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    // 1. Encontrar o usuário pelo e-mail
    const sql = 'SELECT * FROM Usuario WHERE email = $1';
    const { rows } = await db.query(sql, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas.' }); // 401 = Não autorizado
    }

    const usuario = rows[0];

    // 2. Comparar a senha digitada com a senha criptografada do banco
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // 3. Se deu tudo certo, criar o "passe" (Token JWT)
    // O token vai conter o ID e o nome do usuário.
    const payload = {
      usuario_id: usuario.usuario_id,
      nome: usuario.nome_completo
    };

    const token = jwt.sign(
      payload, 
      JWT_SECRET, 
      { expiresIn: '8h' } // O token expira em 8 horas
    );

    // 4. Enviar o token para o usuário
    res.json({ 
      message: 'Login bem-sucedido!',
      token: token 
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});


module.exports = router;