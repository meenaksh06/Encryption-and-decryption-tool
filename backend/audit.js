// audit.js — mini audit trail system
// Every security-relevant event (encrypt, decrypt, delete, validation failure)
// is written as a single JSON line to audit.log AND printed to stdout.
//
// JSON-lines format makes it easy to grep, pipe into jq, or ingest into
// a log aggregator without any special parser.

const fs   = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "audit.log");

// ANSI colour helpers — only used for the console summary, not the file
const C = {
  reset:  "\x1b[0m",
  gray:   "\x1b[90m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  cyan:   "\x1b[36m",
  bold:   "\x1b[1m",
};

// status → colour mapping so failures stand out at a glance
function statusColour(status) {
  if (status === "SUCCESS")  return C.green;
  if (status === "REJECTED") return C.yellow;
  if (status === "FAILURE")  return C.red;
  return C.gray;
}

/**
 * audit(action, req, status, meta)
 *
 * @param {string} action   - Short label, e.g. "ENCRYPT", "DECRYPT", "SECURE_DELETE"
 * @param {object} req      - Express request object (used for IP extraction)
 * @param {string} status   - "SUCCESS" | "REJECTED" | "FAILURE"
 * @param {object} [meta]   - Any extra key/value pairs to include in the log entry
 *
 * Example log line (pretty-printed for readability):
 * {
 *   "timestamp": "2025-02-23T17:42:01.123Z",
 *   "action":    "DECRYPT",
 *   "ip":        "127.0.0.1",
 *   "status":    "REJECTED",
 *   "filename":  "secret.txt.enc",
 *   "reason":    "Invalid key length: got 10 hex characters, expected 64"
 * }
 */
function audit(action, req, status, meta = {}) {
  const ip = req.headers["x-forwarded-for"]
    ? req.headers["x-forwarded-for"].split(",")[0].trim()
    : (req.socket?.remoteAddress || "unknown");

  const entry = {
    timestamp: new Date().toISOString(),
    action,
    ip,
    status,
    ...meta,
  };

  // ── Write to audit.log (append, never overwrite) ──────────────────────────
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");

  // ── Console summary ───────────────────────────────────────────────────────
  const sc   = statusColour(status);
  const time = C.gray + entry.timestamp + C.reset;
  const act  = C.bold + C.cyan + action.padEnd(14) + C.reset;
  const st   = sc + C.bold + status.padEnd(8) + C.reset;
  const ipStr = C.gray + `ip=${ip}` + C.reset;

  // build a short extras string from meta (skip large values like full hashes)
  const extras = Object.entries(meta)
    .map(([k, v]) => {
      const val = String(v);
      return `${k}=${val.length > 72 ? val.slice(0, 32) + "…" : val}`;
    })
    .join("  ");

  console.log(`[audit] ${time}  ${act}  ${st}  ${ipStr}  ${extras}`);
}

module.exports = { audit };
