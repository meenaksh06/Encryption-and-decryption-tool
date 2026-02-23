// server.js — main backend for the encryption/decryption tool
// handles file encryption (AES-256-CBC), decryption, integrity checks (SHA-256),
// secure deletion of encrypted files from disk, rate limiting, and file type validation

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { secureDelete } = require("./secureDelete");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { audit } = require("./audit");
const { isExtensionAllowed, isMagicBytesAllowed } = require("./fileGuard");

const app = express();

app.use(cors());

// we need raw binary bodies for file uploads, not JSON
app.use(
  express.raw({
    type: "*/*",
    limit: "10mb",
  }),
);

// make sure the encrypted/ folder exists on startup so we don't crash later
const encryptedDir = path.join(__dirname, "encrypted");
fs.mkdirSync(encryptedDir, { recursive: true });
fs.chmodSync(encryptedDir, 0o755);

// ── Rate Limiters ────────────────────────────────────────────────────────────
// Prevents brute-force attacks and resource exhaustion.
// Each limiter is scoped by IP (req.ip) and emits an audit entry on a hit.

// Global safety net — catches anything not covered by route-specific limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    audit("RATE_LIMIT", req, "REJECTED", {
      route: req.path,
      reason: "global rate limit exceeded (100 req/15 min)",
    });
    res.status(429).json({
      error: "Too many requests. Please wait a few minutes before trying again.",
    });
  },
});

// Encrypt limiter — AES is CPU-heavy; prevent denial-of-service via bulk uploads
const encryptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    audit("RATE_LIMIT", req, "REJECTED", {
      route: "/encrypt",
      reason: "encrypt rate limit exceeded (20 req/15 min)",
    });
    res.status(429).json({
      error: "Too many encryption requests. Please wait before encrypting again.",
    });
  },
});

// Decrypt limiter — primary brute-force target; strictest limit
const decryptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    audit("RATE_LIMIT", req, "REJECTED", {
      route: "/decrypt",
      reason: "decrypt rate limit exceeded (10 req/15 min)",
    });
    res.status(429).json({
      error: "Too many decryption attempts. Please wait before trying again.",
    });
  },
});

app.use(globalLimiter);

// ────────────────────────────────────────────────
// POST /encrypt — takes a raw file, encrypts it, and saves the .enc to disk
// also computes a SHA-256 hash of the original plaintext so the client
// can verify data integrity later after decryption
// ────────────────────────────────────────────────
app.post("/encrypt", encryptLimiter, (req, res) => {
  const filename = req.headers["x-filename"];

  if (!filename || !req.body || req.body.length === 0) {
    return res.status(400).json({
      error: "File data or filename missing",
    });
  }

  // ── File Type Whitelisting ────────────────────────────────────────────────
  // 1. Extension check — rejects .exe, .sh, .bat, etc. immediately
  if (!isExtensionAllowed(filename)) {
    audit("ENCRYPT", req, "REJECTED", {
      filename,
      reason: "blocked file extension",
    });
    return res.status(400).json({
      error: `File type not allowed. The extension "${path.extname(filename).toLowerCase()}" is not on the whitelist.`,
    });
  }

  // 2. Magic bytes check — catches renamed executables and unrecognised formats
  const magicResult = isMagicBytesAllowed(req.body);
  if (!magicResult.allowed) {
    audit("ENCRYPT", req, "REJECTED", {
      filename,
      reason: `magic bytes rejected: ${magicResult.reason}`,
    });
    return res.status(400).json({
      error: `File content rejected: ${magicResult.reason}. Only safe file types can be encrypted.`,
    });
  }

  // compute SHA-256 of the original file BEFORE encryption
  // this gives us a fingerprint we can compare after decryption
  // to make sure nothing got corrupted or tampered with
  const originalHash = crypto
    .createHash("sha256")
    .update(req.body)
    .digest("hex");

  // generate a fresh random key + IV for this specific file
  const privateKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", privateKey, iv);

  const encryptedData = Buffer.concat([
    cipher.update(req.body),
    cipher.final(),
  ]);

  // unique suffix prevents filename collisions when encrypting the same file twice
  const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(4).toString("hex");
  const encryptedFileName = `${filename}.${uniqueSuffix}.enc`;
  const encryptedPath = path.join(encryptedDir, encryptedFileName);

  fs.writeFileSync(encryptedPath, encryptedData);

  // only the owner should be able to read/write the encrypted file
  fs.chmodSync(encryptedPath, 0o600);

  audit("ENCRYPT", req, "SUCCESS", {
    filename,
    encryptedFileName,
    sizeBytes: req.body.length,
    sha256: originalHash,
    note: "plaintext never written to disk — in-memory only",
  });

  res.status(200).json({
    message: "File encrypted successfully",
    privateKey: privateKey.toString("hex"),
    iv: iv.toString("hex"),
    encryptedFileName,
    sha256: originalHash,
    secureNote:
      "No plaintext was written to disk — data processed in-memory only.",
  });
});

// ────────────────────────────────────────────────
// POST /decrypt — takes encrypted file bytes + key + IV, returns the plaintext
// also computes SHA-256 of the decrypted output and sends it in a response
// header so the client can compare it against the original hash
// ────────────────────────────────────────────────
app.post("/decrypt", decryptLimiter, (req, res) => {
  const keyHex = req.headers["x-private-key"];
  const ivHex = req.headers["x-iv"];
  const originalFilename = req.headers["x-filename"] || "decrypted_file";

  if (!keyHex || !ivHex || !req.body || req.body.length === 0) {
    audit("DECRYPT", req, "REJECTED", {
      filename: originalFilename,
      reason: "missing key, IV, or file body",
    });
    return res.status(400).json({
      error: "Encrypted file data, private key, or IV missing",
    });
  }

  try {
    // ── Key Strength Validation ──────────────────────────────────────────────
    // Check hex string lengths BEFORE converting to buffers.
    // A 32-byte AES-256 key = 64 hex chars; a 16-byte IV = 32 hex chars.
    // Field-specific errors here are far clearer than a generic cipher failure.
    if (keyHex.length !== 64) {
      audit("DECRYPT", req, "REJECTED", {
        filename: originalFilename,
        reason: `invalid key length: got ${keyHex.length} hex chars, expected 64`,
      });
      return res.status(400).json({
        error: `Invalid key length: got ${keyHex.length} hex characters, expected 64 (= 32 bytes). Use the full key from encryption.`,
      });
    }
    if (ivHex.length !== 32) {
      audit("DECRYPT", req, "REJECTED", {
        filename: originalFilename,
        reason: `invalid IV length: got ${ivHex.length} hex chars, expected 32`,
      });
      return res.status(400).json({
        error: `Invalid IV length: got ${ivHex.length} hex characters, expected 32 (= 16 bytes). Use the full IV from encryption.`,
      });
    }

    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.from(ivHex, "hex");

    // byte-level sanity check — non-hex characters cause Node to silently
    // produce a shorter buffer (e.g. "zz" decodes to 0 bytes), so we catch that here
    if (key.length !== 32) {
      audit("DECRYPT", req, "REJECTED", {
        filename: originalFilename,
        reason: "key contains non-hex characters (buffer underflow)",
      });
      return res.status(400).json({
        error: "Key contains invalid hex characters. Expected a 64-character hexadecimal string (0-9, a-f).",
      });
    }
    if (iv.length !== 16) {
      audit("DECRYPT", req, "REJECTED", {
        filename: originalFilename,
        reason: "IV contains non-hex characters (buffer underflow)",
      });
      return res.status(400).json({
        error: "IV contains invalid hex characters. Expected a 32-character hexadecimal string (0-9, a-f).",
      });
    }

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

    const decryptedData = Buffer.concat([
      decipher.update(req.body),
      decipher.final(),
    ]);

    // compute SHA-256 of the decrypted output — the client will compare this
    // against the original hash to detect any tampering or corruption
    const decryptedHash = crypto
      .createHash("sha256")
      .update(decryptedData)
      .digest("hex");

    // need to expose this custom header to the browser (CORS won't show it otherwise)
    res.setHeader("Access-Control-Expose-Headers", "X-Decrypted-SHA256");
    res.setHeader("X-Decrypted-SHA256", decryptedHash);
    res.setHeader("Content-Disposition", `attachment; filename="${originalFilename}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    audit("DECRYPT", req, "SUCCESS", {
      filename: originalFilename,
      sizeBytes: decryptedData.length,
      sha256: decryptedHash,
    });

    res.status(200).send(decryptedData);
  } catch (err) {
    audit("DECRYPT", req, "FAILURE", {
      filename: originalFilename,
      reason: err.message || "cipher error — wrong key or IV",
    });
    res.status(400).json({
      error: "Decryption failed. Check that the key and IV are correct.",
    });
  }
});

// ────────────────────────────────────────────────
// POST /secure-delete — securely wipes an .enc file from disk
// overwrites the content multiple times before unlinking so the OS
// can't recover the data blocks later
// ────────────────────────────────────────────────
app.post("/secure-delete", (req, res) => {
  const filename = req.headers["x-filename"];

  if (!filename) {
    return res.status(400).json({ error: "Filename header (x-filename) is required" });
  }

  // only encrypted files should be deletable through this endpoint
  if (!filename.endsWith(".enc")) {
    return res.status(400).json({ error: "Only .enc files can be securely deleted" });
  }

  // path traversal guard — someone could try "../../etc/passwd" etc.
  // we strip the path and only use the basename, then verify it resolves inside our dir
  const resolved = path.resolve(encryptedDir, path.basename(filename));
  if (!resolved.startsWith(encryptedDir)) {
    return res.status(403).json({ error: "Path traversal detected — access denied" });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: "File not found on server" });
  }

  try {
    const result = secureDelete(resolved);
    audit("SECURE_DELETE", req, "SUCCESS", {
      filename,
      passes: result.passes,
      bytesOverwritten: result.bytesOverwritten,
    });
    res.status(200).json({
      message: "File securely deleted",
      passes: result.passes,
      bytesOverwritten: result.bytesOverwritten,
    });
  } catch (err) {
    audit("SECURE_DELETE", req, "FAILURE", {
      filename,
      reason: err.message,
    });
    res.status(500).json({ error: "Secure delete failed: " + err.message });
  }
});

app.listen(8080, () => {
  console.log("Encryption server running on port 8080");
});
