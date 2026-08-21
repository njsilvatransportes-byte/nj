require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT) || 3000;
// Em produção (Railway, etc.) escuta em 0.0.0.0; localmente em 127.0.0.1
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
const root = __dirname;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, family: 4 });
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const hash = password => crypto.scryptSync(password, 'njtransportes', 64).toString('hex');
const json = (response, status, body) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(body)); };
const readBody = request => new Promise((resolve, reject) => { let body = ''; request.on('data', chunk => body += chunk); request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Dados inválidos.')); } }); });

async function initializeDatabase() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, approved BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS drivers (id UUID PRIMARY KEY, name TEXT NOT NULL, cpf TEXT UNIQUE NOT NULL, cnh TEXT NOT NULL, category TEXT NOT NULL, expiry DATE NOT NULL, status TEXT NOT NULL, phone TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS vehicles (id UUID PRIMARY KEY, plate TEXT UNIQUE NOT NULL, model TEXT NOT NULL, type TEXT NOT NULL, year INTEGER NOT NULL, renavam TEXT, status TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
     CREATE TABLE IF NOT EXISTS clients (id UUID PRIMARY KEY, name TEXT NOT NULL, document TEXT, phone TEXT, address TEXT NOT NULL, number TEXT, neighborhood TEXT, city TEXT NOT NULL, state TEXT NOT NULL, zip_code TEXT, reference TEXT, status TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
     CREATE TABLE IF NOT EXISTS suppliers (id UUID PRIMARY KEY, name TEXT NOT NULL, document TEXT, address TEXT NOT NULL, supplier_type TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
     CREATE TABLE IF NOT EXISTS freight_entries (id UUID PRIMARY KEY, date DATE NOT NULL, driver_id UUID REFERENCES drivers(id), vehicle_id UUID REFERENCES vehicles(id), client_id UUID REFERENCES clients(id), destination TEXT NOT NULL, freight NUMERIC(12,2) NOT NULL, tolls NUMERIC(12,2) DEFAULT 0, expenses NUMERIC(12,2) DEFAULT 0, sest_senat NUMERIC(12,2) DEFAULT 0, irrf NUMERIC(12,2) DEFAULT 0, inss NUMERIC(12,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS partner_stations (id UUID PRIMARY KEY, name TEXT NOT NULL, cnpj TEXT, phone TEXT, address TEXT, city TEXT, state TEXT, created_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS fuelings (id UUID PRIMARY KEY, date DATE NOT NULL, vehicle_id UUID REFERENCES vehicles(id), mileage NUMERIC, price_per_liter NUMERIC, quantity_liters NUMERIC, driver_id UUID REFERENCES drivers(id), station_id UUID REFERENCES partner_stations(id), notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()); CREATE TABLE IF NOT EXISTS audit_log (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE SET NULL, user_name TEXT, action TEXT NOT NULL, resource TEXT NOT NULL, resource_id UUID, detail JSONB, created_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE; ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE; ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Operador'; ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT; ALTER TABLE drivers ADD COLUMN IF NOT EXISTS zip_code TEXT, ADD COLUMN IF NOT EXISTS address TEXT, ADD COLUMN IF NOT EXISTS number TEXT, ADD COLUMN IF NOT EXISTS neighborhood TEXT, ADD COLUMN IF NOT EXISTS city TEXT, ADD COLUMN IF NOT EXISTS state TEXT; ALTER TABLE drivers ADD COLUMN IF NOT EXISTS photo TEXT; ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_password_hash TEXT; ALTER TABLE freight_entries ADD COLUMN IF NOT EXISTS sest_senat NUMERIC(12,2) DEFAULT 0; ALTER TABLE freight_entries ADD COLUMN IF NOT EXISTS irrf NUMERIC(12,2) DEFAULT 0; ALTER TABLE freight_entries ADD COLUMN IF NOT EXISTS inss NUMERIC(12,2) DEFAULT 0; ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS trade_name TEXT, ADD COLUMN IF NOT EXISTS phone TEXT, ADD COLUMN IF NOT EXISTS email TEXT; ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS zip_code TEXT, ADD COLUMN IF NOT EXISTS number TEXT, ADD COLUMN IF NOT EXISTS neighborhood TEXT, ADD COLUMN IF NOT EXISTS city TEXT, ADD COLUMN IF NOT EXISTS state TEXT;`);
  await seedDefaultAdmin();
}

async function seedDefaultAdmin() {
  const email = 'admin@njtransportes.com';
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, approved, role)
     VALUES ($1, $2, $3, $4, TRUE, 'Administrador')
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash, approved = TRUE, role = 'Administrador'`,
    [crypto.randomUUID(), 'Administrador', email, hash('admin123')]
  );
}
async function logAudit(userId, userName, action, resource, resourceId, detail) {
  if (!userId) return;
  try {
    await pool.query(
      'INSERT INTO audit_log (id, user_id, user_name, action, resource, resource_id, detail) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [crypto.randomUUID(), userId, userName, action, resource, resourceId, detail ? JSON.stringify(detail) : null]
    );
  } catch (e) {
    console.error('Erro ao gravar auditoria:', e.message);
  }
}
async function api(request, response, url) {
  const method = request.method, route = url.pathname;
  const performedById = request.headers['x-user-id'] || null;
  const performedByName = request.headers['x-user-name'] ? decodeURIComponent(request.headers['x-user-name']) : null;
  
  if (route === '/api/auth/register' && method === 'POST') { const { name, email, password } = await readBody(request); if (!name || !email || !password) return json(response, 400, { error: 'Preencha todos os campos.' }); const id = crypto.randomUUID(); const emailClean = email.trim().toLowerCase(); try { await pool.query('INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)', [id, name.trim(), emailClean, hash(password)]); return json(response, 201, { id, name: name.trim() }); } catch (error) { if (error.code === '23505') { await pool.query('UPDATE users SET pending_password_hash = $1 WHERE email = $2', [hash(password), emailClean]); return json(response, 200, { message: 'Solicitação de nova senha enviada para aprovação.' }); } return json(response, 500, { error: 'Não foi possível criar a conta.' }); } }
  if (route === '/api/auth/login' && method === 'POST') { const { email, password } = await readBody(request); const result = await pool.query('SELECT id, name, password_hash, approved, active, role, photo FROM users WHERE email = $1', [String(email).trim().toLowerCase()]); const user = result.rows[0]; if (!user || user.password_hash !== hash(password || '')) return json(response, 401, { error: 'E-mail ou senha inválidos.' }); if (!user.approved) return json(response, 403, { error: 'Seu acesso aguarda aprovação.' }); if (user.active === false) return json(response, 403, { error: 'Seu acesso foi desativado. Entre em contato com o administrador.' }); return json(response, 200, { id: user.id, name: user.name, role: user.role, photo: user.photo || null }); }
  if (route === '/api/users' && method === 'GET') { const result = await pool.query('SELECT id, name, email, role, photo, approved, active, created_at, pending_password_hash IS NOT NULL AS has_pending_password FROM users ORDER BY created_at DESC'); return json(response, 200, result.rows); }
  if (route.match(/^\/api\/users\/[\w-]+\/photo$/) && method === 'PUT') {
    const userId = route.split('/')[3];
    const body = await readBody(request);
    const photo = body.photo || null;
    if (photo && photo.length > 2800000) return json(response, 413, { error: 'Imagem muito grande. Máximo 2 MB.' });
    await pool.query('UPDATE users SET photo=$1 WHERE id=$2', [photo, userId]);
    await logAudit(performedById, performedByName, 'UPDATE', 'users', userId, { action: 'user_photo_update' });
    return json(response, 200, { id: userId, photo });
  }
  if (route.match(/^\/api\/users\/[\w-]+\/photo$/) && method === 'DELETE') {
    const userId = route.split('/')[3];
    await pool.query('UPDATE users SET photo=NULL WHERE id=$1', [userId]);
    await logAudit(performedById, performedByName, 'UPDATE', 'users', userId, { action: 'user_photo_delete' });
    return json(response, 200, { id: userId, photo: null });
  }
  if (route.match(/^\/api\/users\/[\w-]+\/approve$/) && method === 'PUT') { const id = route.split('/')[3]; await pool.query('UPDATE users SET approved=TRUE, active=TRUE WHERE id=$1', [id]); await logAudit(performedById, performedByName, 'UPDATE', 'users', id, { action: 'approve' }); return json(response, 200, { id, approved: true }); }
  if (route.match(/^\/api\/users\/[\w-]+\/inactivate$/) && method === 'PUT') { const id = route.split('/')[3]; await pool.query('UPDATE users SET active=FALSE WHERE id=$1', [id]); await logAudit(performedById, performedByName, 'UPDATE', 'users', id, { action: 'inactivate' }); return json(response, 200, { id, active: false }); }
  if (route.match(/^\/api\/users\/[\w-]+\/reactivate$/) && method === 'PUT') { const id = route.split('/')[3]; await pool.query('UPDATE users SET active=TRUE WHERE id=$1', [id]); await logAudit(performedById, performedByName, 'UPDATE', 'users', id, { action: 'reactivate' }); return json(response, 200, { id, active: true }); }
  if (route.match(/^\/api\/users\/[\w-]+\/role$/) && method === 'PUT') { const id = route.split('/')[3]; const body = await readBody(request); if (!['Administrador', 'Supervisor', 'Operador'].includes(body.role)) return json(response, 400, { error: 'Nível de acesso inválido.' }); await pool.query('UPDATE users SET role=$1 WHERE id=$2', [body.role, id]); await logAudit(performedById, performedByName, 'UPDATE', 'users', id, { action: 'change_role', role: body.role }); return json(response, 200, { id, role: body.role }); }
  if (route.match(/^\/api\/users\/[\w-]+\/approve-password$/) && method === 'PUT') { const id = route.split('/')[3]; await pool.query('UPDATE users SET password_hash = pending_password_hash, pending_password_hash = NULL WHERE id=$1', [id]); await logAudit(performedById, performedByName, 'UPDATE', 'users', id, { action: 'approve_password' }); return json(response, 200, { id, password_approved: true }); }
  if (route.match(/^\/api\/users\/[\w-]+\/reject-password$/) && method === 'PUT') { const id = route.split('/')[3]; await pool.query('UPDATE users SET pending_password_hash = NULL WHERE id=$1', [id]); await logAudit(performedById, performedByName, 'UPDATE', 'users', id, { action: 'reject_password' }); return json(response, 200, { id, password_rejected: true }); }
  const resource = route.match(/^\/api\/(drivers|vehicles|clients|suppliers|freight_entries|partner_stations|fuelings)(?:\/([\w-]+))?$/); if (!resource) return false;
  // Dedicated photo endpoint: PUT /api/drivers/:id/photo
  if (route.match(/^\/api\/drivers\/[\w-]+\/photo$/) && method === 'PUT') {
    const driverId = route.split('/')[3];
    const body = await readBody(request);
    if (!body.photo) return json(response, 400, { error: 'Foto não informada.' });
    // Limit to ~2MB base64 (~1.5MB image)
    if (body.photo.length > 2800000) return json(response, 413, { error: 'Imagem muito grande. Máximo 2 MB.' });
    await pool.query('UPDATE drivers SET photo=$1 WHERE id=$2', [body.photo, driverId]);
    await logAudit(performedById, performedByName, 'UPDATE', 'drivers', driverId, { action: 'photo_update' });
    return json(response, 200, { id: driverId, photo: body.photo });
  }
  const [ , table, id ] = resource; const fields = table === 'drivers' ? ['name', 'cpf', 'cnh', 'category', 'expiry', 'status', 'phone', 'zip_code', 'address', 'number', 'neighborhood', 'city', 'state', 'photo'] : table === 'vehicles' ? ['plate', 'model', 'type', 'year', 'renavam', 'status'] : table === 'suppliers' ? ['name', 'trade_name', 'document', 'phone', 'email', 'address', 'zip_code', 'number', 'neighborhood', 'city', 'state', 'supplier_type'] : table === 'freight_entries' ? ['date','driver_id','vehicle_id','client_id','destination','freight','tolls','expenses','sest_senat','irrf','inss'] : table === 'fuelings' ? ['date','vehicle_id','mileage','price_per_liter','quantity_liters','driver_id','station_id','notes'] : table === 'partner_stations' ? ['name','cnpj','phone','address','city','state'] : ['name', 'document', 'phone', 'address', 'number', 'neighborhood', 'city', 'state', 'zip_code', 'reference', 'status'];
  if (method === 'GET') { const result = table === 'freight_entries' ? await pool.query('SELECT f.*, d.name AS driver_name, v.plate, c.name AS client_name FROM freight_entries f LEFT JOIN drivers d ON d.id=f.driver_id LEFT JOIN vehicles v ON v.id=f.vehicle_id LEFT JOIN clients c ON c.id=f.client_id ORDER BY f.created_at DESC') : table === 'fuelings' ? await pool.query('SELECT f.*, v.plate, d.name AS driver_name, s.name AS station_name FROM fuelings f LEFT JOIN vehicles v ON v.id=f.vehicle_id LEFT JOIN drivers d ON d.id=f.driver_id LEFT JOIN partner_stations s ON s.id=f.station_id ORDER BY f.created_at DESC') : await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`); return json(response, 200, result.rows); }
  if (method === 'DELETE' && id) {
    try {
      const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
      if (!result.rowCount) return json(response, 404, { error: 'Lançamento não encontrado.' });
      await logAudit(performedById, performedByName, 'DELETE', table, id, null);
      return json(response, 200, { id, deleted: true });
    } catch (error) {
      return json(response, 500, { error: 'Não foi possível excluir o registro.' });
    }
  }
  const data = method === 'DELETE' ? {} : await readBody(request);
  if (method === 'POST') {
    const recordId = crypto.randomUUID();
    const values = [recordId, ...fields.map(field => data[field] ?? null)];
    try {
      await pool.query(`INSERT INTO ${table} (id, ${fields.join(', ')}) VALUES ($1, ${fields.map((_, index) => '$' + (index + 2)).join(', ')})`, values);
      await logAudit(performedById, performedByName, 'CREATE', table, recordId, data);
      return json(response, 201, { id: recordId, ...data });
    } catch (error) {
      return json(response, error.code === '23505' ? 409 : 500, { error: error.code === '23505' ? 'Já existe um cadastro com este identificador.' : 'Não foi possível salvar.' });
    }
  }
  if (method === 'PUT' && id) {
    const values = fields.map(field => data[field] ?? null);
    try {
      await pool.query(`UPDATE ${table} SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(', ')} WHERE id = $${fields.length + 1}`, [...values, id]);
      await logAudit(performedById, performedByName, 'UPDATE', table, id, data);
      return json(response, 200, { id, ...data });
    } catch (error) {
      return json(response, error.code === '23505' ? 409 : 500, { error: error.code === '23505' ? 'Já existe um cadastro com este identificador.' : 'Não foi possível atualizar.' });
    }
  }
  return json(response, 405, { error: 'Método não permitido.' });
}
const server = http.createServer(async (request, response) => { const url = new URL(request.url, `http://${request.headers.host}`); try { if (url.pathname.startsWith('/api/')) { const handled = await api(request, response, url); if (handled === false) json(response, 404, { error: 'Rota não encontrada.' }); return; } const requested = url.pathname === '/' ? 'dashboard.html' : url.pathname.replace(/^[/\\]+/, ''); const file = path.resolve(root, requested); if (!file.startsWith(root + path.sep)) return response.end('Acesso não permitido.'); fs.readFile(file, (error, content) => { if (error) { response.writeHead(404); return response.end('Arquivo não encontrado.'); } response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); response.end(content); }); } catch (error) { console.error(error); json(response, 500, { error: 'Erro interno do servidor.' }); } });
initializeDatabase().then(() => server.listen(PORT, HOST, () => console.log(`NJTransportes disponível em http://localhost:${PORT}`))).catch(error => { console.error('Não foi possível conectar ao Supabase. Confira DATABASE_URL no arquivo .env.'); console.error(error.message); process.exit(1); });
