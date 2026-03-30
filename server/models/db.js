/**
 * LeadScout - Database Layer
 * SQLite setup and queries using sql.js (pure JavaScript, no native compilation)
 * 
 * Note: sql.js runs SQLite in WebAssembly, which means:
 * - No native compilation required
 * - Database is loaded into memory and must be saved to disk manually
 * - Works on any platform with Node.js
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

let db = null;
let dbPath = null;

/**
 * Initialize database and schema
 * Must be called before any database operations
 */
async function initializeDatabase() {
  dbPath = path.join(__dirname, '..', '..', 'data', 'leadscout.db');
  
  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize sql.js
  const SQL = await initSqlJs();
  
  // Try to load existing database or create new
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('Database loaded from:', dbPath);
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
  } catch (err) {
    console.log('Creating fresh database due to error:', err.message);
    db = new SQL.Database();
  }

  // Create schema
  db.run(`
    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      prospect_name TEXT NOT NULL,
      prospect_headline TEXT,
      prospect_company TEXT,
      prospect_location TEXT,
      prospect_about TEXT,
      prospect_role TEXT,
      prospect_posts TEXT,
      lines_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_generations_created_at 
    ON generations(created_at DESC)
  `);

  // Save initial schema
  saveDatabase();
  
  console.log('Database initialized at:', dbPath);
}

/**
 * Save database to disk
 */
function saveDatabase() {
  if (!db || !dbPath) return;
  
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

/**
 * Generate a unique ID for a generation
 */
function generateId() {
  return `gen_${uuidv4().split('-')[0]}`;
}

/**
 * Save a new generation to the database
 * @param {Object} profile - Profile data
 * @param {Array} lines - Generated lines
 * @returns {Object} Created generation record
 */
function saveGeneration(profile, lines) {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  const id = generateId();
  const createdAt = new Date().toISOString();
  
  const postsJson = Array.isArray(profile.recentPosts) 
    ? JSON.stringify(profile.recentPosts) 
    : profile.recentPosts || null;
  
  const linesJson = JSON.stringify(lines);

  db.run(`
    INSERT INTO generations 
    (id, prospect_name, prospect_headline, prospect_company, prospect_location, 
     prospect_about, prospect_role, prospect_posts, lines_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    profile.name,
    profile.headline || null,
    profile.company || null,
    profile.location || null,
    profile.about || null,
    profile.currentRole || null,
    postsJson,
    linesJson,
    createdAt
  ]);

  // Save to disk after each write
  saveDatabase();

  return {
    id,
    lines,
    createdAt
  };
}

/**
 * Get a generation by ID
 * @param {string} id - Generation ID
 * @returns {Object|null} Generation record or null
 */
function getGenerationById(id) {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  const stmt = db.prepare('SELECT * FROM generations WHERE id = ?');
  stmt.bind([id]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return formatGeneration(row);
  }
  
  stmt.free();
  return null;
}

/**
 * Get recent generations (summary only)
 * @param {number} limit - Max records to return
 * @returns {Array} Array of generation summaries
 */
function getRecentGenerations(limit = 10) {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  const safeLimit = Math.min(limit, 50);
  const stmt = db.prepare(`
    SELECT id, prospect_name, prospect_company, created_at 
    FROM generations 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  stmt.bind([safeLimit]);
  
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id,
      prospectName: row.prospect_name,
      company: row.prospect_company,
      createdAt: row.created_at
    });
  }
  
  stmt.free();
  return results;
}

/**
 * Get all generations with full data
 * @param {number} limit - Max records to return
 * @returns {Array} Array of full generation records
 */
function getAllGenerations(limit = 10) {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  const safeLimit = Math.min(limit, 50);
  const stmt = db.prepare('SELECT * FROM generations ORDER BY created_at DESC LIMIT ?');
  stmt.bind([safeLimit]);
  
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(formatGeneration(row));
  }
  
  stmt.free();
  return results;
}

/**
 * Get usage statistics
 * @returns {Object} Stats object
 */
function getStats() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  // Get total count
  let totalStmt = db.prepare('SELECT COUNT(*) as total FROM generations');
  totalStmt.step();
  const total = totalStmt.getAsObject().total;
  totalStmt.free();

  // Get today's count
  let todayStmt = db.prepare(`
    SELECT COUNT(*) as today 
    FROM generations 
    WHERE date(created_at) = date('now')
  `);
  todayStmt.step();
  const today = todayStmt.getAsObject().today;
  todayStmt.free();

  // Get last generation timestamp
  let lastStmt = db.prepare('SELECT created_at FROM generations ORDER BY created_at DESC LIMIT 1');
  let lastGeneration = null;
  if (lastStmt.step()) {
    lastGeneration = lastStmt.getAsObject().created_at;
  }
  lastStmt.free();

  // Get first generation timestamp (for avg per day calculation)
  let firstStmt = db.prepare('SELECT created_at FROM generations ORDER BY created_at ASC LIMIT 1');
  let firstGeneration = null;
  if (firstStmt.step()) {
    firstGeneration = firstStmt.getAsObject().created_at;
  }
  firstStmt.free();

  return {
    today: today || 0,
    allTime: total || 0,
    lastGeneration,
    firstGeneration
  };
}

/**
 * Format a database row into API response format
 */
function formatGeneration(row) {
  let lines = [];
  try {
    lines = JSON.parse(row.lines_json);
  } catch (e) {
    lines = [];
  }

  let recentPosts = [];
  try {
    if (row.prospect_posts) {
      recentPosts = JSON.parse(row.prospect_posts);
    }
  } catch (e) {
    recentPosts = [];
  }

  return {
    id: row.id,
    prospectName: row.prospect_name,
    headline: row.prospect_headline,
    company: row.prospect_company,
    location: row.prospect_location,
    about: row.prospect_about,
    currentRole: row.prospect_role,
    recentPosts,
    lines,
    createdAt: row.created_at
  };
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    saveDatabase(); // Save before closing
    db.close();
    db = null;
  }
}

module.exports = {
  initializeDatabase,
  saveGeneration,
  getGenerationById,
  getRecentGenerations,
  getAllGenerations,
  getStats,
  closeDatabase
};
