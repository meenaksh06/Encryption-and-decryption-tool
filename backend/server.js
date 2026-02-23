const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { secureDelete } = require("./secureDelete");
const cors = require("cors");

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

  // Audit log: confirm no temporary plaintext was written to disk
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

  // if (!keyHex || !ivHex || !req.body || req.body.length === 0) {
  //   return res.status(400).json({
  //     error: "Encrypted file data, private key, or IV missing",
  //   });
  // }

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
      error: "Decryption failed. Check that the key and IV are correct.",
    });
  }
});

// ── Secure Delete endpoint ──
app.post("/secure-delete", (req, res) => {
  const filename = req.headers["x-filename"];

  if (!filename) {
    return res.status(400).json({ error: "Filename header (x-filename) is required" });
  }

  // Only allow .enc files
  if (!filename.endsWith(".enc")) {
    return res.status(400).json({ error: "Only .enc files can be securely deleted" });
  }

  // Path-traversal guard: resolve and verify it stays inside encryptedDir
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
