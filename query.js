require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query("SELECT f.mileage, f.quantity_liters, f.date FROM fuelings f JOIN vehicles v ON v.id = f.vehicle_id WHERE v.plate = 'HMV-9G49' ORDER BY f.date ASC, f.created_at ASC")
  .then(r => { 
    console.log(r.rows); 
    process.exit(0); 
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
