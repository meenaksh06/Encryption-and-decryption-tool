const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const DB_PATH = path.join(__dirname, "vault.db");

let _db = null;
let _nativeDb = null;
let resolveReady = null;
const readyPromise = new Promise((resolve) => {
  resolveReady = resolve;
});
const proxy = new Proxy(
  {},
  {
    get(_, key) {
      if (key === "ready") return () => readyPromise;
      if (!_db) throw new Error("Database not ready yet");
      return _db[key];
    },
  }
);

function persist() {
  if (!_nativeDb) return;
  try {
    const data = _nativeDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error("Failed to persist database:", e.message);
  }
}

function createWrapper(nativeDb) {
  return {
    exec(sql) {
      nativeDb.exec(sql);
      persist();
    },
    pragma(sqlOrName, value) {
      if (typeof sqlOrName === "string" && value === undefined) {
        nativeDb.run(`PRAGMA ${sqlOrName}`);
      } else {
        nativeDb.run(`PRAGMA ${sqlOrName} = ${value}`);
      }
    },
    prepare(sql) {
      const stmt = nativeDb.prepare(sql);
      return {
        get(...params) {
          stmt.bind(params);
          const row = stmt.step() ? stmt.getAsObject() : null;
          stmt.free();
          return row || undefined;
        },
        all(...params) {
          stmt.bind(params);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows;
        },
        run(...params) {
          stmt.bind(params);
          stmt.step();
          stmt.free();
          const rowIdRes = nativeDb.exec("SELECT last_insert_rowid() AS lastInsertRowid");
          const lastInsertRowid = rowIdRes.length && rowIdRes[0].values[0] ? rowIdRes[0].values[0][0] : 0;
          const changesRes = nativeDb.exec("SELECT changes() AS changes");
          const changes = changesRes.length && changesRes[0].values[0] ? changesRes[0].values[0][0] : 0;
          persist();
          return { lastInsertRowid, changes };
        },
      };
    },
  };
}

async function init() {
  const SQL = await initSqlJs();
  let data = null;
  if (fs.existsSync(DB_PATH)) {
    data = fs.readFileSync(DB_PATH);
  }
  _nativeDb = new SQL.Database(data);
  _db = createWrapper(_nativeDb);

  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    public_key TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    iv TEXT NOT NULL,
    key_sha256 TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(user_id, contact_id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(user_a, user_b)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL DEFAULT 'text',
    body TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS key_vault (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    encrypted_data TEXT NOT NULL,
    enc_iv TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

  const existingCols = _db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!existingCols.includes("public_key")) {
    _db.exec("ALTER TABLE users ADD COLUMN public_key TEXT");
  }
  if (!existingCols.includes("vault_salt")) {
    _db.exec("ALTER TABLE users ADD COLUMN vault_salt TEXT");
  }

  persist();
  resolveReady(_db);
  return _db;
}

init().catch((err) => {
  console.error("Database init failed:", err);
  process.exit(1);
});

module.exports = proxy;
