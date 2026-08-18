require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Pool } = require("pg");
const XLSX = require("xlsx");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ============================================================
//  CONFIGURACOES
// ============================================================
const PLANILHA_PATH = "J:\\Meu Drive\\Planilhas\\Frete.xlsm";
const SHEET_NAME = "Lancamentos";

// ============================================================
//  LOG
// ============================================================
const LOG_DIR = path.resolve(__dirname, "../logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, "import_fretes_" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".log");

function log(msg) {
  const line = "[" + new Date().toLocaleString("pt-BR") + "] " + msg;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// ============================================================
//  BANCO DE DADOS
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4
});

// ============================================================
//  HELPERS
// ============================================================
function parseDate(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [, d, m, y] = match;
      return y + "-" + m + "-" + d;
    }
  }
  if (typeof value === "number") {
    const utc_days = Math.floor(value - 25569);
    const date_info = new Date(utc_days * 86400 * 1000);
    return date_info.toISOString().split("T")[0];
  }
  return null;
}

function parseMoney(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const str = String(value).replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Busca ou cria cliente
// clients: id, name NOT NULL, document, phone, address NOT NULL, number, neighborhood, city NOT NULL, state NOT NULL, zip_code, reference, status NOT NULL
async function findOrCreateClient(name) {
  if (!name || String(name).trim() === "") return null;
  const clientName = String(name).trim();
  const res = await pool.query("SELECT id FROM clients WHERE name ILIKE $1", [clientName]);
  if (res.rows.length > 0) return res.rows[0].id;
  const newId = crypto.randomUUID();
  await pool.query(
    "INSERT INTO clients (id, name, address, city, state, status) VALUES ($1, $2, $3, $4, $5, $6)",
    [newId, clientName, "Nao informado", "Nao informado", "RJ", "Ativo"]
  );
  log("[+] Cliente criado automaticamente: " + clientName);
  return newId;
}

async function findDriver(name) {
  if (!name || String(name).trim() === "") return null;
  const driverName = String(name).trim();
  let res = await pool.query("SELECT id FROM drivers WHERE name ILIKE $1", [driverName]);
  if (res.rows.length > 0) return res.rows[0].id;
  const firstName = driverName.split(" ")[0];
  res = await pool.query("SELECT id FROM drivers WHERE name ILIKE $1", ["%" + firstName + "%"]);
  if (res.rows.length > 0) return res.rows[0].id;
  return null;
}

async function findVehicle(plate) {
  if (!plate || String(plate).trim() === "") return null;
  const cleanPlate = String(plate).replace(/[-\s]/g, "").toUpperCase().trim();
  const res = await pool.query(
    "SELECT id FROM vehicles WHERE REPLACE(REPLACE(plate, '-', ''), ' ', '') ILIKE $1",
    [cleanPlate]
  );
  return res.rows.length > 0 ? res.rows[0].id : null;
}

// ============================================================
//  PRINCIPAL
// ============================================================
async function run() {
  log("========================================");
  log("  INICIO DA IMPORTACAO DE FRETES");
  log("========================================");
  log("Planilha: " + PLANILHA_PATH);
  log("Aba: " + SHEET_NAME);

  try {
    if (!fs.existsSync(PLANILHA_PATH)) {
      log("[ERRO] Arquivo nao encontrado: " + PLANILHA_PATH);
      process.exit(1);
    }

    const workbook = XLSX.readFile(PLANILHA_PATH);
    if (!workbook.SheetNames.includes(SHEET_NAME)) {
      log("[ERRO] Aba nao encontrada. Abas: " + workbook.SheetNames.join(", "));
      process.exit(1);
    }

    const ws = workbook.Sheets[SHEET_NAME];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const dataRows = rows.slice(1).filter(row => row[1] && String(row[1]).trim() !== "");
    log("Total de lancamentos na planilha: " + dataRows.length);

    await pool.query("SELECT 1");
    log("Conectado ao banco de dados com sucesso.");

    let importados = 0, ignorados = 0, erros = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      // Colunas da planilha:
      // [0] Lanc.  [1] Data  [2] Motorista  [3] Placa  [4] Cliente
      // [5] Destino  [6] Frete  [7] Comissao  [8] Pedagios  [9] Despesas
      const lancNum     = row[0];
      const dataRaw     = row[1];
      const motorista   = String(row[2] || "").trim().toUpperCase();
      const placa       = String(row[3] || "").trim().toUpperCase();
      const cliente     = String(row[4] || "").trim().toUpperCase();
      const destino     = String(row[5] || "").trim().toUpperCase();
      const freteRaw    = row[6];
      const pedagiosRaw = row[8];
      const despesasRaw = row[9];

      const date     = parseDate(dataRaw);
      const freight  = parseMoney(freteRaw);
      const tolls    = parseMoney(pedagiosRaw);
      const expenses = parseMoney(despesasRaw);

      if (!date) {
        log("[AVISO] Linha " + (i + 2) + ": data invalida (" + JSON.stringify(dataRaw) + "), ignorando.");
        ignorados++;
        continue;
      }
      if (!destino || freight <= 0) {
        log("[AVISO] Linha " + (i + 2) + ": destino ou frete invalido, ignorando. Lanc.#" + lancNum);
        ignorados++;
        continue;
      }

      try {
        const driverId  = await findDriver(motorista);
        const vehicleId = await findVehicle(placa);
        const clientId  = await findOrCreateClient(cliente);

        if (!driverId && motorista) log("[AVISO] Motorista nao encontrado: \"" + motorista + "\" (Lanc.#" + lancNum + ")");
        if (!vehicleId && placa)   log("[AVISO] Veiculo nao encontrado: \"" + placa + "\" (Lanc.#" + lancNum + ")");

        // Verifica duplicata: mesma data, frete, destino, motorista e veiculo
        const exists = await pool.query(
          "SELECT id FROM freight_entries WHERE date = $1 AND freight = $2 AND destination ILIKE $3 AND (driver_id = $4 OR ($4::uuid IS NULL AND driver_id IS NULL)) AND (vehicle_id = $5 OR ($5::uuid IS NULL AND vehicle_id IS NULL))",
          [date, freight, destino, driverId, vehicleId]
        );

        if (exists.rows.length > 0) {
          ignorados++;
          continue;
        }

        const newId = crypto.randomUUID();
        await pool.query(
          "INSERT INTO freight_entries (id, date, driver_id, vehicle_id, client_id, destination, freight, tolls, expenses) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [newId, date, driverId, vehicleId, clientId, destino, freight, tolls, expenses]
        );

        log("[OK] Lanc.#" + lancNum + " | " + date + " | " + motorista + " | " + placa + " | " + cliente + " | " + destino + " | R$ " + freight.toFixed(2));
        importados++;
      } catch (rowError) {
        log("[ERRO] Linha " + (i + 2) + " (Lanc.#" + lancNum + "): " + rowError.message);
        erros++;
      }
    }

    log("");
    log("========================================");
    log("  IMPORTACAO CONCLUIDA");
    log("  Importados:  " + importados);
    log("  Ja existiam: " + ignorados);
    log("  Erros:       " + erros);
    log("========================================");
    log("Log salvo em: " + LOG_FILE);
  } catch (error) {
    log("[ERRO FATAL] " + error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

run();
