const express = require('express');
const cors = require('cors');

// Configuração do App
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

// Carregar Rotas
const usuarioRoutes = require('./routes/usuarios');
const clienteRoutes = require('./routes/clientes');
const processoRoutes = require('./routes/processos');
const documentoRoutes = require('./routes/documentos');

// NOVAS ROTAS FINANCEIRAS
const honorarioRoutes = require('./routes/honorarios');
const parcelaRoutes = require('./routes/parcelas');
const pagamentoRoutes = require('./routes/pagamentos');

// Usar Rotas
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/processos', processoRoutes);
app.use('/api/documentos', documentoRoutes);

// NOVAS ROTAS FINANCEIRAS
app.use('/api/honorarios', honorarioRoutes);
app.use('/api/parcelas', parcelaRoutes);
app.use('/api/pagamentos', pagamentoRoutes);

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`Servidor LEX rodando na porta ${PORT}`);
});