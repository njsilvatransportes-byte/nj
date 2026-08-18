require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const XLSX = require('xlsx');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuração de log
const LOG_DIR = path.resolve(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, 'import_fuelings.log');

function log(msg) {
  const line = `[${new Date().toLocaleString('pt-BR')}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }, 
  family: 4 
});

// Função para converter data numérica do Excel para o formato 'YYYY-MM-DD'
function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return new Date().toISOString().split('T')[0];
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

async function run() {
  try {
    log("===== INICIO DA IMPORTACAO DE ABASTECIMENTOS =====");
    log("Conectando ao banco de dados do NJTransportes...");
    
    // Caminho da planilha
    const filePath = 'J:\\Meu Drive\\Planilhas\\Relatorio - Copia.xlsm';
    log(`Lendo arquivo: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Aba 'Respostas'
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    
    // Pula o cabeçalho
    const rows = data.slice(1);
    log(`Total de registros encontrados (linhas): ${rows.length}`);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const row of rows) {
      if (!row || row.length < 2) continue; // Pula linhas vazias
      
      const [
        carimboDateRaw,
        placaRaw,
        kilometragemRaw,
        precoLitroRaw,
        qtdLitrosRaw,
        valorRaw,
        motoristaRaw,
        postoRaw,
        obsRaw,
        notaRaw,
        emailRaw,
        dataRaw
      ] = row;
      
      if (!placaRaw) continue; // Pula se não houver placa
      
      const date = excelDateToJSDate(dataRaw || carimboDateRaw);
      const placa = String(placaRaw).replace(/[-\s]/g, '').toUpperCase();
      const motorista = motoristaRaw ? String(motoristaRaw).trim() : null;
      const posto = postoRaw ? String(postoRaw).trim() : null;
      const kilometragem = kilometragemRaw ? Number(kilometragemRaw) : null;
      const precoLitro = precoLitroRaw ? Number(precoLitroRaw) : null;
      const qtdLitros = qtdLitrosRaw ? Number(qtdLitrosRaw) : null;
      
      // 1. Encontrar o Veículo (se não achar a placa idêntica, tenta buscar só pelas letras/números)
      let vehicleId = null;
      let vRes = await pool.query("SELECT id FROM vehicles WHERE REPLACE(plate, '-', '') = $1", [placa]);
      if (vRes.rows.length > 0) {
        vehicleId = vRes.rows[0].id;
      } else {
        vehicleId = crypto.randomUUID();
        const formattedPlate = placa.length === 7 ? placa.substring(0,3) + '-' + placa.substring(3) : placa;
        await pool.query(
            "INSERT INTO vehicles (id, plate, model, type, year, status) VALUES ($1, $2, 'Não informado', 'Outro', 2000, 'Em operação')", 
            [vehicleId, formattedPlate]
        );
        log(`[!] Veículo ${formattedPlate} criado automaticamente.`);
      }
      
      // 2. Encontrar o Motorista
      let driverId = null;
      if (motorista) {
          const searchName = motorista.split(' ')[0]; // Procura pelo primeiro nome pra facilitar match
          const dRes = await pool.query("SELECT id FROM drivers WHERE name ILIKE $1", [`%${searchName}%`]);
          if (dRes.rows.length > 0) {
              driverId = dRes.rows[0].id;
          }
      }
      
      // 3. Encontrar ou Criar Posto Parceiro
      let stationId = null;
      if (posto) {
          const sRes = await pool.query("SELECT id FROM partner_stations WHERE name ILIKE $1", [posto]);
          if (sRes.rows.length > 0) {
              stationId = sRes.rows[0].id;
          } else {
              stationId = crypto.randomUUID();
              await pool.query("INSERT INTO partner_stations (id, name) VALUES ($1, $2)", [stationId, posto]);
              log(`[+] Posto parceiro criado: ${posto}`);
          }
      }
      
      // 4. Inserir Abastecimento (Evitar duplicatas comparando date, vehicle e kilometragem)
      const fRes = await pool.query("SELECT id FROM fuelings WHERE vehicle_id = $1 AND date = $2 AND mileage = $3", [vehicleId, date, kilometragem]);
      
      if (fRes.rows.length === 0) {
          const fuelingId = crypto.randomUUID();
          await pool.query(`
            INSERT INTO fuelings (id, date, vehicle_id, mileage, price_per_liter, quantity_liters, driver_id, station_id, notes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, 
            [fuelingId, date, vehicleId, kilometragem, precoLitro, qtdLitros, driverId, stationId, obsRaw]
          );
          importedCount++;
      } else {
          skippedCount++;
      }
    }
    
    log(`\nImportação concluída: ${importedCount} novos | ${skippedCount} já existiam (ignorados).`);
    log("===== FIM DA IMPORTACAO =====");
  } catch (error) {
    log(`[ERRO] ${error.message}`);
    console.error(error);
  } finally {
    pool.end();
  }
}

run();
