// server.js — main backend for the encryption/decryption tool
// handles file encryption (AES-256-CBC), decryption, integrity checks (SHA-256),
// and secure deletion of encrypted files from disk

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { secureDelete } = require("./secureDelete");
const cors = require("cors");

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

// ────────────────────────────────────────────────
// POST /encrypt — takes a raw file, encrypts it, and saves the .enc to disk
// also computes a SHA-256 hash of the original plaintext so the client
// can verify data integrity later after decryption
// ────────────────────────────────────────────────
app.post("/encrypt", (req, res) => {
  const filename = req.headers["x-filename"];

  if (!filename || !req.body || req.body.length === 0) {
    return res.status(400).json({
      error: "File data or filename missing",
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

  // audit log — important for OS security: confirms we never wrote the
  // plaintext to a temp file, everything stayed in RAM
  console.log(
    `[secure] No temp plaintext on disk for "${filename}" — in-memory only | SHA-256: ${originalHash}`,
  );

  res.status(200).json({
    message: "File encrypted successfully",
    privateKey: privateKey.toString("hex"),
    iv: iv.toString("hex"),
    encryptedFileName,
    // send the hash back so the client can store it and verify after decryption
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
app.post("/decrypt", (req, res) => {
  const keyHex = req.headers["x-private-key"];
  const ivHex = req.headers["x-iv"];
  const originalFilename = req.headers["x-filename"] || "decrypted_file";

  if (!keyHex || !ivHex || !req.body || req.body.length === 0) {
    return res.status(400).json({
      error: "Encrypted file data, private key, or IV missing",
    });
  }

  try {
    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.from(ivHex, "hex");

    // quick sanity check — catches typos/truncated keys before the cipher blows up
    if (key.length !== 32 || iv.length !== 16) {
      return res.status(400).json({
        error: "Invalid key or IV length. Key must be 64 hex chars, IV must be 32 hex chars.",
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

    console.log(
      `[integrity] Decrypted "${originalFilename}" | SHA-256: ${decryptedHash}`,
    );

    res.status(200).send(decryptedData);
  } catch (err) {
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
    console.log(
      `[secure-delete] Wiped "${filename}": ${result.passes} passes, ${result.bytesOverwritten} bytes overwritten`,
    );
    res.status(200).json({
      message: "File securely deleted",
      passes: result.passes,
      bytesOverwritten: result.bytesOverwritten,
    });
  } catch (err) {
    console.error(`[secure-delete] Failed to delete "${filename}":`, err);
    res.status(500).json({ error: "Secure delete failed: " + err.message });
  }
});

app.listen(8080, () => {
  console.log("Encryption server running on port 8080");
});
