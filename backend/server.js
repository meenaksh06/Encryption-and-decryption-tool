const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(
  express.raw({
    type: "*/*",
    limit: "10mb",
  })
);

const encryptedDir = path.join(__dirname, "encrypted");
fs.mkdirSync(encryptedDir, { recursive: true });
fs.chmodSync(encryptedDir, 0o755);

app.post("/encrypt", (req, res) => {
  const filename = req.headers["x-filename"];

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

app.listen(8080, () => {
  console.log("Encryption server running on port 8080");
});