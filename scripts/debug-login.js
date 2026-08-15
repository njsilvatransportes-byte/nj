require('dotenv').config();
const crypto = require('crypto');
const { Pool } = require('pg');

const hash = password => crypto.scryptSync(password, 'njtransportes', 64).toString('hex');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const email = 'admin@njtransportes.com';

(async () => {
  const result = await pool.query(
    'SELECT email, approved, password_hash = $2 AS senha_ok FROM users WHERE email = $1',
    [email, hash('admin123')]
  );
  console.log('DB admin:', result.rows[0] || 'nao encontrado');

  const login = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'admin123' })
  });
  const body = await login.json();
  console.log('API login:', login.status, body);
  await pool.end();
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
