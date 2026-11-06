require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  console.log('Testing CTRC duplicate validation and storage...');

  // Get a driver, vehicle, client
  const d = await pool.query('SELECT id FROM drivers LIMIT 1');
  const v = await pool.query('SELECT id FROM vehicles LIMIT 1');
  const c = await pool.query('SELECT id FROM clients LIMIT 1');

  if (!d.rows.length || !v.rows.length || !c.rows.length) {
    console.log('Missing prerequisite data, creating mock...');
  }

  const driverId = d.rows[0]?.id;
  const vehicleId = v.rows[0]?.id;
  const clientId = c.rows[0]?.id;

  const testCtrc = 'CTRC-TEST-' + Date.now();

  // Test 1: Insert
  const id1 = require('crypto').randomUUID();
  await pool.query(
    'INSERT INTO freight_entries (id, date, ctrc, driver_id, vehicle_id, client_id, destination, freight, tolls, expenses, sest_senat, irrf, inss) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
    [id1, '2026-11-06', testCtrc, driverId, vehicleId, clientId, 'TEST DESTINATION', 1500, 50, 0, 10, 20, 0]
  );
  console.log('Test 1: Inserted entry with CTRC:', testCtrc);

  // Test 2: Duplicate insert direct DB constraint
  let threw = false;
  try {
    const id2 = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO freight_entries (id, date, ctrc, driver_id, vehicle_id, client_id, destination, freight, tolls, expenses, sest_senat, irrf, inss) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [id2, '2026-11-06', testCtrc.toLowerCase(), driverId, vehicleId, clientId, 'ANOTHER DESTINATION', 2000, 0, 0, 0, 0, 0]
    );
  } catch (err) {
    threw = true;
    console.log('Test 2: DB correctly rejected duplicate CTRC! Error code:', err.code, err.message);
  }

  if (!threw) {
    throw new Error('Test 2 failed: duplicate CTRC was allowed!');
  }

  // Cleanup
  await pool.query('DELETE FROM freight_entries WHERE id = $1', [id1]);
  console.log('Test 3: Cleaned up test record.');

  await pool.end();
  console.log('All tests passed successfully!');
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

