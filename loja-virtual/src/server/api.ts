import { createHash, randomBytes } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { database } from './database';

interface ProdutoRow {
  id: number;
  nome: string;
  artista: string;
  preco: number;
  imagem: string;
  descricao: string | null;
  ano: number;
  regiao: string;
  faixas: string;
}

interface AuthenticatedRequest extends Request {
  usuarioId?: number;
}

const tokens = new Map<string, number>();
const router = Router();

const produto = (row: ProdutoRow) => ({
  ...row,
  faixas: JSON.parse(row.faixas) as string[],
});

const senhaHash = (senha: string): string =>
  createHash('sha256').update(senha).digest('hex');

const usuarioPublico = (usuario: { id: number; nome: string; email: string; cpf: string; telefone: string }) => ({
  id: usuario.id,
  nome: usuario.nome,
  email: usuario.email,
  cpf: usuario.cpf,
  telefone: usuario.telefone,
});

const autenticar = (req: AuthenticatedRequest, res: Response): number | undefined => {
  const cabecalho = req.headers.authorization;
  const token = cabecalho?.startsWith('Bearer ') ? cabecalho.slice(7) : '';
  const usuarioId = tokens.get(token);
  if (!usuarioId) {
    res.status(401).json({ mensagem: 'Sessão inválida ou expirada.' });
    return undefined;
  }
  req.usuarioId = usuarioId;
  return usuarioId;
};

router.get('/produtos', (req, res) => {
  const termo = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
  const rows = termo
    ? database.prepare(`
        SELECT * FROM produtos
        WHERE nome LIKE ? OR artista LIKE ?
        ORDER BY nome
      `).all(`%${termo}%`, `%${termo}%`) as unknown as ProdutoRow[]
    : database.prepare('SELECT * FROM produtos ORDER BY id').all() as unknown as ProdutoRow[];
  res.json(rows.map(produto));
});

router.get('/produtos/:id', (req, res) => {
  const row = database.prepare('SELECT * FROM produtos WHERE id = ?').get(Number(req.params['id'])) as ProdutoRow | undefined;
  if (!row) {
    res.status(404).json({ mensagem: 'Produto não encontrado.' });
    return;
  }
  res.json(produto(row));
});

router.get('/auth/disponibilidade', (req, res) => {
  const campos = ['nome', 'email', 'senha', 'cpf', 'telefone'] as const;
  const campo = req.query['campo'];
  const valor = req.query['valor'];

  if (typeof campo !== 'string' || !campos.includes(campo as typeof campos[number]) ||
      typeof valor !== 'string' || !valor.trim()) {
    res.status(400).json({ disponivel: false, mensagem: 'Campo e valor são obrigatórios.' });
    return;
  }

  const normalizado = campo === 'email'
    ? valor.trim().toLowerCase()
    : campo === 'cpf' || campo === 'telefone'
      ? valor.replace(/\D/g, '')
      : valor.trim();
  const coluna = campo === 'senha' ? 'senha_hash' : campo;
  const valorBanco = campo === 'senha' ? senhaHash(valor) : normalizado;
  const row = database.prepare(
    `SELECT 1 FROM usuarios WHERE ${coluna} = ? COLLATE NOCASE LIMIT 1`
  ).get(valorBanco);

  res.json({
    disponivel: !row,
    mensagem: row ? `Este ${campo} já está cadastrado.` : ''
  });
});

router.post('/auth/cadastro', (req, res) => {
  const { nome, email, senha, cpf, telefone } = req.body as Record<string, unknown>;
  if ([nome, email, senha, cpf, telefone].some(value => typeof value !== 'string' || !value.trim())) {
    res.status(400).json({ mensagem: 'Todos os campos são obrigatórios.' });
    return;
  }
  const dados = {
    nome: (nome as string).trim(),
    email: email as string,
    senha: senha as string,
    cpf: (cpf as string).replace(/\D/g, ''),
    telefone: (telefone as string).replace(/\D/g, ''),
  };
  try {
    const result = database.prepare(`
      INSERT INTO usuarios (nome, email, senha_hash, cpf, telefone)
      VALUES (?, ?, ?, ?, ?)
    `).run(dados.nome.trim(), dados.email.trim().toLowerCase(), senhaHash(dados.senha), dados.cpf.trim(), dados.telefone.trim());
    res.status(201).json({ id: Number(result.lastInsertRowid), mensagem: 'Cadastro realizado com sucesso.' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      res.status(409).json({ mensagem: 'Este email já está cadastrado.' });
      return;
    }
    if (error instanceof Error && error.message.includes('DUPLICATE_USER_DATA')) {
      const duplicado = database.prepare(`
        SELECT
          CASE
            WHEN lower(trim(nome)) = lower(trim(?)) THEN 'nome'
            WHEN lower(trim(email)) = lower(trim(?)) THEN 'email'
            WHEN cpf = ? THEN 'cpf'
            WHEN telefone = ? THEN 'telefone'
            WHEN senha_hash = ? THEN 'senha'
          END AS campo
        FROM usuarios
        WHERE lower(trim(nome)) = lower(trim(?))
           OR lower(trim(email)) = lower(trim(?))
           OR cpf = ?
           OR telefone = ?
           OR senha_hash = ?
        LIMIT 1
      `).get(
        dados.nome, dados.email.trim().toLowerCase(), dados.cpf, dados.telefone,
        senhaHash(dados.senha), dados.nome, dados.email.trim().toLowerCase(),
        dados.cpf, dados.telefone, senhaHash(dados.senha)
      ) as { campo: string } | undefined;
      res.status(409).json({ mensagem: `Este ${duplicado?.campo ?? 'dado'} já está cadastrado.` });
      return;
    }
    res.status(500).json({ mensagem: 'Não foi possível realizar o cadastro.' });
  }
});

router.post('/auth/login', (req, res) => {
  const { email, senha } = req.body as Record<string, unknown>;
  if (typeof email !== 'string' || typeof senha !== 'string') {
    res.status(400).json({ mensagem: 'Email e senha são obrigatórios.' });
    return;
  }
  const usuario = database.prepare(`
    SELECT id, nome, email, cpf, telefone FROM usuarios
    WHERE email = ? AND senha_hash = ?
  `).get(email.trim().toLowerCase(), senhaHash(senha)) as {
    id: number; nome: string; email: string; cpf: string; telefone: string;
  } | undefined;
  if (!usuario) {
    res.status(401).json({ mensagem: 'Email ou senha inválidos.' });
    return;
  }
  const token = randomBytes(32).toString('hex');
  tokens.set(token, usuario.id);
  res.json({ token, usuario: usuarioPublico(usuario) });
});

router.post('/auth/recuperar-senha', (req, res) => {
  const email = req.body?.email;
  if (typeof email !== 'string' || !email.trim()) {
    res.status(400).json({ mensagem: 'Informe um email válido.' });
    return;
  }
  const existe = database.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(email.trim().toLowerCase());
  res.json({ mensagem: existe ? 'Instruções de recuperação enviadas.' : 'Se o email existir, as instruções serão enviadas.' });
});

router.get('/me', (req: AuthenticatedRequest, res) => {
  const usuarioId = autenticar(req, res);
  if (!usuarioId) return;
  const usuario = database.prepare('SELECT id, nome, email, cpf, telefone FROM usuarios WHERE id = ?').get(usuarioId) as {
    id: number; nome: string; email: string; cpf: string; telefone: string;
  } | undefined;
  res.json(usuarioPublico(usuario!));
});

router.post('/pedidos', (req: AuthenticatedRequest, res) => {
  const usuarioId = autenticar(req, res);
  if (!usuarioId) return;
  const itens = req.body?.itens as Array<{ produtoId: number; quantidade: number }> | undefined;
  if (!Array.isArray(itens) || itens.length === 0 || itens.some(item => !Number.isInteger(item.produtoId) || !Number.isInteger(item.quantidade) || item.quantidade < 1)) {
    res.status(400).json({ mensagem: 'O pedido deve conter itens válidos.' });
    return;
  }
  const linhas = itens.map(item => database.prepare('SELECT id, preco FROM produtos WHERE id = ?').get(item.produtoId) as { id: number; preco: number } | undefined);
  if (linhas.some(linha => !linha)) {
    res.status(400).json({ mensagem: 'Um ou mais produtos não existem.' });
    return;
  }
  const total = itens.reduce((valor, item, index) => valor + linhas[index]!.preco * item.quantidade, 0);
  const pedido = database.prepare('INSERT INTO pedidos (usuario_id, total) VALUES (?, ?)').run(usuarioId, total);
  const inserirItem = database.prepare(`
    INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
    VALUES (?, ?, ?, ?)
  `);
  itens.forEach((item, index) => inserirItem.run(Number(pedido.lastInsertRowid), item.produtoId, item.quantidade, linhas[index]!.preco));
  res.status(201).json({ id: Number(pedido.lastInsertRowid), total });
});

router.get('/pedidos', (req: AuthenticatedRequest, res) => {
  const usuarioId = autenticar(req, res);
  if (!usuarioId) return;
  const pedidos = database.prepare('SELECT id, total, criado_em AS criadoEm FROM pedidos WHERE usuario_id = ? ORDER BY id DESC').all(usuarioId);
  res.json(pedidos);
});

export { router as apiRouter };
