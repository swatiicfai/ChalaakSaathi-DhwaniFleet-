const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'chalaaksaathi.db');
const db = new DatabaseSync(DB_PATH);

const DEFAULT_SHIPMENT_ID = 'HR-55-AJ-9021';

function initSchema() {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      driver_name TEXT NOT NULL,
      driver_phone TEXT NOT NULL,
      preferred_language TEXT NOT NULL,
      consignee TEXT NOT NULL,
      cargo_type TEXT NOT NULL,
      cargo_value TEXT NOT NULL,
      eway_bill_no TEXT NOT NULL,
      eway_bill_status TEXT NOT NULL,
      scheduled_slot TEXT NOT NULL,
      current_status TEXT NOT NULL,
      allocated_bay TEXT NOT NULL,
      reefer_temp REAL NOT NULL,
      temp_status TEXT NOT NULL,
      detention_hours REAL NOT NULL,
      detention_rate_per_hour INTEGER NOT NULL,
      total_claim_amount REAL NOT NULL,
      is_detention_clock_running INTEGER NOT NULL,
      detention_start_time TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS eway_bills (
      eway_bill_no TEXT PRIMARY KEY,
      truck_id TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      cargo_type TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS excursion_tickets (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      temp REAL NOT NULL,
      status TEXT NOT NULL,
      cargo TEXT NOT NULL,
      action TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demurrage_claims (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      warehouse_name TEXT NOT NULL,
      detention_hours REAL NOT NULL,
      rate_per_hour INTEGER NOT NULL,
      total_claim_inr REAL NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incident_cards (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      summary TEXT NOT NULL,
      language TEXT NOT NULL,
      urgency TEXT NOT NULL,
      share_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS telemetry_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      response_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      total_turns INTEGER NOT NULL DEFAULT 0,
      last_ttft_ms INTEGER
    );
  `);
}

function nowTime() {
  return new Date().toLocaleTimeString();
}

function seedDefaultsIfEmpty() {
  const existing = db.prepare('SELECT id FROM shipments WHERE id = ?').get(DEFAULT_SHIPMENT_ID);
  if (!existing) {
    resetState();
  }
}

function seedEwayBills() {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO eway_bills
      (eway_bill_no, truck_id, origin, destination, cargo_type, valid_until, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  upsert.run('408', 'HR-55-AJ-9021', 'Baddi Pharma Park, HP', 'Bharat Life Sciences Cold Hub, Sonipat', 'Covaxin & Biologics (2-8°C)', 'Today 11:59 PM IST', 'ACTIVE_VALID');
  upsert.run('409', 'TN-09-CR-4410', 'Sriperumbudur Bio Hub, TN', 'Chennai Cold Hub, Ambattur', 'Insulin Cold-Chain Pens (2-8°C)', 'Today 11:59 PM IST', 'ACTIVE_VALID');
  upsert.run('712', 'MH-12-RF-8832', 'Pune Serum Depot, MH', 'Navi Mumbai Reefer Terminal', 'Pediatric Biologics (2-8°C)', 'Today 10:30 PM IST', 'ACTIVE_VALID');
}

function resetState() {
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM excursion_tickets').run();
    db.prepare('DELETE FROM demurrage_claims').run();
    db.prepare('DELETE FROM incident_cards').run();
    db.prepare('DELETE FROM audit_logs').run();

    db.prepare(`
      INSERT OR REPLACE INTO shipments (
        id, driver_name, driver_phone, preferred_language, consignee,
        cargo_type, cargo_value, eway_bill_no, eway_bill_status,
        scheduled_slot, current_status, allocated_bay, reefer_temp,
        temp_status, detention_hours, detention_rate_per_hour,
        total_claim_amount, is_detention_clock_running, detention_start_time, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      DEFAULT_SHIPMENT_ID,
      'Gurpreet Singh',
      '+91 98765 43210',
      'Hinglish / Punjabi / Tamil / Marathi (Auto)',
      'Bharat Life Sciences Cold Hub (Sonipat)',
      'Temperature Sensitive Vaccines (Covaxin & Biologics)',
      '₹ 1,45,00,000',
      'EWB-408',
      'PENDING_GATE_VERIFY',
      'Gate 2 - Bay 2 (11:00 AM)',
      'GATE_ARRIVED_PENDING_INSPECTION',
      'Gate 2 - Bay 2',
      5.4,
      'WARNING_EXCURSION',
      0.0,
      2200,
      0,
      0,
      null,
      new Date().toISOString()
    );

    seedEwayBills();

    db.prepare(`
      INSERT OR REPLACE INTO telemetry_stats
        (id, prompt_tokens, response_tokens, total_tokens, total_turns, last_ttft_ms)
      VALUES (1, 0, 0, 0, 0, NULL)
    `).run();

    db.prepare(
      'INSERT INTO audit_logs (shipment_id, timestamp, message, type) VALUES (?, ?, ?, ?)'
    ).run(
      DEFAULT_SHIPMENT_ID,
      nowTime(),
      'SQLite Ledger initialized. Truck HR-55-AJ-9021 arrived at Sonipat Hub perimeter.',
      'info'
    );

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return getState();
}

function addAuditLog(message, type = 'info') {
  db.prepare(
    'INSERT INTO audit_logs (shipment_id, timestamp, message, type) VALUES (?, ?, ?, ?)'
  ).run(DEFAULT_SHIPMENT_ID, nowTime(), message, type);
}

function normalizeEwayBill(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (digits.endsWith('408')) return '408';
  if (digits.endsWith('409')) return '409';
  if (digits.endsWith('712')) return '712';
  return digits || String(raw || '').trim();
}

function lookupEwayBill(rawNumber) {
  const code = normalizeEwayBill(rawNumber);
  return db.prepare('SELECT * FROM eway_bills WHERE eway_bill_no = ?').get(code);
}

function updateEwayBillStatus(ewayBillNo, status) {
  db.prepare(
    'UPDATE shipments SET eway_bill_no = ?, eway_bill_status = ?, updated_at = ? WHERE id = ?'
  ).run(`EWB-${ewayBillNo}`, status, new Date().toISOString(), DEFAULT_SHIPMENT_ID);
}

function updateDockSlot(newBay) {
  const row = db.prepare('SELECT allocated_bay FROM shipments WHERE id = ?').get(DEFAULT_SHIPMENT_ID);
  const oldBay = row ? row.allocated_bay : 'Gate 2 - Bay 2';
  db.prepare(
    'UPDATE shipments SET allocated_bay = ?, current_status = ?, updated_at = ? WHERE id = ?'
  ).run(newBay, 'BAY_REASSIGNED_PROCEEDING', new Date().toISOString(), DEFAULT_SHIPMENT_ID);
  return oldBay;
}

function insertExcursionTicket(ticket) {
  db.prepare(
    'UPDATE shipments SET reefer_temp = ?, temp_status = ?, updated_at = ? WHERE id = ?'
  ).run(ticket.temp, ticket.status, new Date().toISOString(), DEFAULT_SHIPMENT_ID);

  db.prepare(`
    INSERT INTO excursion_tickets (id, shipment_id, timestamp, temp, status, cargo, action)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    ticket.id,
    DEFAULT_SHIPMENT_ID,
    ticket.timestamp,
    ticket.temp,
    ticket.status,
    ticket.cargo,
    ticket.action
  );
}

function insertDemurrageClaim(claim) {
  db.prepare(`
    UPDATE shipments
    SET is_detention_clock_running = 1,
        detention_start_time = ?,
        detention_hours = ?,
        total_claim_amount = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    claim.timestamp,
    claim.detentionHours,
    claim.totalClaimInr,
    new Date().toISOString(),
    DEFAULT_SHIPMENT_ID
  );

  db.prepare(`
    INSERT INTO demurrage_claims (id, shipment_id, warehouse_name, detention_hours, rate_per_hour, total_claim_inr, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    claim.id,
    DEFAULT_SHIPMENT_ID,
    claim.warehouseName,
    claim.detentionHours,
    claim.ratePerHour,
    claim.totalClaimInr,
    claim.timestamp
  );
}

function insertIncidentCard(card) {
  db.prepare(`
    INSERT INTO incident_cards (id, shipment_id, timestamp, summary, language, urgency, share_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    card.id,
    DEFAULT_SHIPMENT_ID,
    card.timestamp,
    card.summary,
    card.language,
    card.urgency,
    card.shareUrl
  );
}

function recordUsage({ promptTokens = 0, responseTokens = 0, totalTokens = 0, ttftMs = null }) {
  const current = db.prepare('SELECT * FROM telemetry_stats WHERE id = 1').get();
  const nextPrompt = (current?.prompt_tokens || 0) + promptTokens;
  const nextResponse = (current?.response_tokens || 0) + responseTokens;
  const nextTotal = (current?.total_tokens || 0) + totalTokens;
  const nextTurns = (current?.total_turns || 0) + 1;
  const nextTtft = ttftMs !== null ? ttftMs : current?.last_ttft_ms ?? null;

  db.prepare(`
    UPDATE telemetry_stats
    SET prompt_tokens = ?, response_tokens = ?, total_tokens = ?, total_turns = ?, last_ttft_ms = ?
    WHERE id = 1
  `).run(nextPrompt, nextResponse, nextTotal, nextTurns, nextTtft);
}

function getState() {
  const s = db.prepare('SELECT * FROM shipments WHERE id = ?').get(DEFAULT_SHIPMENT_ID);
  const tickets = db
    .prepare('SELECT * FROM excursion_tickets WHERE shipment_id = ? ORDER BY rowid DESC LIMIT 20')
    .all(DEFAULT_SHIPMENT_ID);
  const claims = db
    .prepare('SELECT * FROM demurrage_claims WHERE shipment_id = ? ORDER BY rowid DESC LIMIT 20')
    .all(DEFAULT_SHIPMENT_ID);
  const cards = db
    .prepare('SELECT id, timestamp, summary, language, urgency, share_url AS shareUrl FROM incident_cards WHERE shipment_id = ? ORDER BY rowid DESC LIMIT 10')
    .all(DEFAULT_SHIPMENT_ID);
  const logs = db
    .prepare('SELECT timestamp, message, type FROM audit_logs WHERE shipment_id = ? ORDER BY id DESC LIMIT 40')
    .all(DEFAULT_SHIPMENT_ID);
  const telemetry = db.prepare('SELECT * FROM telemetry_stats WHERE id = 1').get();

  return {
    truckId: s.id,
    driverName: s.driver_name,
    driverPhone: s.driver_phone,
    preferredLanguage: s.preferred_language,
    consignee: s.consignee,
    cargoType: s.cargo_type,
    cargoValue: s.cargo_value,
    ewayBillNo: s.eway_bill_no,
    ewayBillStatus: s.eway_bill_status,
    scheduledSlot: s.scheduled_slot,
    currentStatus: s.current_status,
    allocatedBay: s.allocated_bay,
    reeferTemp: s.reefer_temp,
    tempStatus: s.temp_status,
    detentionHours: s.detention_hours,
    detentionRatePerHour: s.detention_rate_per_hour,
    totalClaimAmount: s.total_claim_amount,
    isDetentionClockRunning: Boolean(s.is_detention_clock_running),
    detentionStartTime: s.detention_start_time,
    activeTickets: tickets,
    demurrageClaims: claims,
    incidentCards: cards,
    logs,
    telemetry: {
      promptTokens: telemetry?.prompt_tokens || 0,
      responseTokens: telemetry?.response_tokens || 0,
      totalTokens: telemetry?.total_tokens || 0,
      totalTurns: telemetry?.total_turns || 0,
      lastTtftMs: telemetry?.last_ttft_ms ?? null
    },
    persistenceMode: 'SQLite (node:sqlite)'
  };
}

initSchema();
seedDefaultsIfEmpty();

module.exports = {
  DB_PATH,
  getState,
  resetState,
  addAuditLog,
  lookupEwayBill,
  updateEwayBillStatus,
  updateDockSlot,
  insertExcursionTicket,
  insertDemurrageClaim,
  insertIncidentCard,
  recordUsage
};
