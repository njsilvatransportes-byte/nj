require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const { Pool } = require('pg');

const hash = password => crypto.scryptSync(password, 'njtransportes', 64).toString('hex');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não configurada no .env');
    process.exit(1);
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE');

  const email = 'admin@njtransportes.com';
  const passwordHash = hash('admin123');

  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, approved)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, approved = TRUE`,
    [crypto.randomUUID(), 'Administrador', email, passwordHash]
  );

  const result = await pool.query(
    'SELECT id, name, email, approved, password_hash FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];
  const loginOk = user && user.password_hash === hash('admin123');

  console.log('Usuário:', user ? { id: user.id, name: user.name, email: user.email, approved: user.approved } : 'NÃO ENCONTRADO');
  console.log('Senha admin123 válida:', loginOk ? 'SIM' : 'NÃO');
}

main()
  .then(() => pool.end())
  .catch(error => {
    console.error('Erro:', error.message);
    process.exit(1);
  });
