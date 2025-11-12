const jwt = require('jsonwebtoken');

// A MESMA chave secreta que usamos para criar o token no login
const JWT_SECRET = 'sua-chave-secreta-muito-forte-12345';

// Esta é a função do "Segurança"
const authMiddleware = (req, res, next) => {
  // 1. O segurança pede o "crachá" (Token)
  // O token vem no cabeçalho (Header) da requisição, assim:
  // Authorization: Bearer <token_gigante_aqui>
  const authHeader = req.headers.authorization;

  // 2. Verifica se o crachá foi enviado
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  // 3. Pega apenas o token (sem o "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // 4. Verifica se o crachá é válido (se a assinatura bate)
    const payload = jwt.verify(token, JWT_SECRET);

    // 5. Se for válido, o segurança "carimba" a requisição
    // com os dados do usuário e libera a passagem.
    req.usuario = payload; // O payload tem { usuario_id, nome }
    next(); // <--- 'next()' significa "pode ir para a próxima função (a rota)"

  } catch (err) {
    // 6. Se o crachá for falso ou expirado
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

module.exports = authMiddleware;