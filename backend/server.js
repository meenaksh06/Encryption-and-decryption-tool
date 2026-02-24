const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { secureDelete } = require("./secureDelete");
const cors = require("cors");
const mime = require("mime-types");

// ── File Type Whitelisting ──
const ALLOWED_EXTENSIONS = new Set([
  // Documents
  ".txt", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".odt", ".ods", ".odp", ".rtf", ".csv",
  // Images
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".ico", ".tiff",
  // Audio
  ".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a",
  // Video
  ".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv",
  // Archives
  ".zip", ".tar", ".gz", ".7z", ".rar", ".bz2",
  // Data / Config
  ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".env",
  // Misc
  ".md", ".log", ".html", ".css",
]);

const BLOCKED_MIME_PREFIXES = [
  "application/x-msdownload",   // .exe, .dll
  "application/x-msdos-program",
  "application/x-executable",
  "application/x-sharedlib",
  "application/x-shellscript",  // .sh
  "application/x-bat",          // .bat
  "application/x-msi",          // .msi
  "application/hta",            // .hta
  "application/x-httpd-php",    // .php
];

function validateFileType(filename) {
  const ext = path.extname(filename).toLowerCase();

  // Check extension whitelist
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      allowed: false,
      reason: `File extension "${ext}" is not allowed. Allowed types: documents, images, audio, video, archives, and data files.`,
    };
  }

  // Check MIME type against blocklist
  const mimeType = mime.lookup(filename) || "application/octet-stream";
  const isBlockedMime = BLOCKED_MIME_PREFIXES.some((prefix) =>
    mimeType.startsWith(prefix),
  );

  if (isBlockedMime) {
    return {
      allowed: false,
      reason: `MIME type "${mimeType}" is blocked for security reasons.`,
    };
  }

  return { allowed: true, mimeType, ext };
}

const app = express();

app.use(cors());

app.use(
  express.raw({
    type: "*/*",
    limit: "10mb",
  }),
);

const encryptedDir = path.join(__dirname, "encrypted");
fs.mkdirSync(encryptedDir, { recursive: true });
fs.chmodSync(encryptedDir, 0o755);

app.post("/encrypt", (req, res) => {
  const filename = req.headers["x-filename"];

  if (!filename || !req.body || req.body.length === 0) {
    return res.status(400).json({
      error: "File data or filename missing",
    });
  }

  // ── File type validation ──
  const validation = validateFileType(filename);
  if (!validation.allowed) {
    return res.status(415).json({
      error: validation.reason,
    });
  }

  const privateKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", privateKey, iv);

  const encryptedData = Buffer.concat([
    cipher.update(req.body),
    cipher.final(),
  ]);

  const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(4).toString("hex");

  const encryptedFileName = `${filename}.${uniqueSuffix}.enc`;

  const encryptedPath = path.join(encryptedDir, encryptedFileName);

  fs.writeFileSync(encryptedPath, encryptedData);

  fs.chmodSync(encryptedPath, 0o600);

  console.log(
    `[secure] No temp plaintext written to disk for "${filename}" — data processed in-memory only.`,
  );

  res.status(200).json({
    message: "File encrypted successfully",
    privateKey: privateKey.toString("hex"),
    iv: iv.toString("hex"),
    encryptedFileName,
    secureNote:
      "No plaintext was written to disk — data processed in-memory only.",
  });
});

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

    res.setHeader("Content-Disposition", `attachment; filename="${originalFilename}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.status(200).send(decryptedData);
  } catch (err) {
    res.status(400).json({
      error: "Decryption failed. Check for private key",
    });
  }
});

app.post("/secure-delete", (req, res) => {
  const filename = req.headers["x-filename"];

  if (!filename) {
    return res.status(400).json({ error: "Filename header (x-filename) is required" });
  }

  if (!filename.endsWith(".enc")) {
    return res.status(400).json({ error: "Only .enc files can be securely deleted" });
  }

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
      `[secure-delete] Securely deleted "${filename}": ${result.passes} passes, ${result.bytesOverwritten} bytes overwritten.`,
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
