const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
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

  res.status(200).json({
    message: "File encrypted successfully",
    privateKey: privateKey.toString("hex"),
    iv: iv.toString("hex"),
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
      error: "Decryption failed. Check that the key and IV are correct.",
    });
  }
});

app.listen(8080, () => {
  console.log("Encryption server running on port 8080");
});
