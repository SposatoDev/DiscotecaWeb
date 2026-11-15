import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { ProdutoService } from '../app/core/produto';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3') as typeof import('better-sqlite3');
const databasePath = join(process.cwd(), 'data', 'vinilshop.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });

export const database = new Database(databasePath);

database.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    artista TEXT NOT NULL,
    preco REAL NOT NULL,
    imagem TEXT NOT NULL,
    descricao TEXT,
    ano INTEGER NOT NULL,
    regiao TEXT NOT NULL,
    faixas TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    senha_hash TEXT NOT NULL,
    cpf TEXT NOT NULL,
    telefone TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    total REAL NOT NULL,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS itens_pedido (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL,
    preco_unitario REAL NOT NULL
  );
`);

database.exec(`
  CREATE INDEX IF NOT EXISTS idx_usuarios_nome ON usuarios (nome COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_usuarios_cpf ON usuarios (cpf);
  CREATE INDEX IF NOT EXISTS idx_usuarios_telefone ON usuarios (telefone);
  CREATE INDEX IF NOT EXISTS idx_usuarios_senha_hash ON usuarios (senha_hash);

  CREATE TRIGGER IF NOT EXISTS impedir_usuario_duplicado
  BEFORE INSERT ON usuarios
  WHEN EXISTS (
    SELECT 1
    FROM usuarios
    WHERE lower(trim(nome)) = lower(trim(NEW.nome))
       OR lower(trim(email)) = lower(trim(NEW.email))
       OR cpf = NEW.cpf
       OR telefone = NEW.telefone
       OR senha_hash = NEW.senha_hash
  )
  BEGIN
    SELECT RAISE(ABORT, 'DUPLICATE_USER_DATA');
  END;
`);

const inserirProduto = database.prepare(`
  INSERT OR IGNORE INTO produtos
    (id, nome, artista, preco, imagem, descricao, ano, regiao, faixas)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const produto of ProdutoService.PRODUTOS_INICIAIS) {
  inserirProduto.run(
    produto.id,
    produto.nome,
    produto.artista,
    produto.preco,
    produto.imagem,
    produto.descricao ?? null,
    produto.ano,
    produto.regiao,
    JSON.stringify(produto.faixas ?? []),
  );
}
