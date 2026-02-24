require("dotenv").config();
const express = require("express");
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const { secureDelete } = require("./secureDelete");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { audit } = require("./audit");
const { isExtensionAllowed, isMagicBytesAllowed } = require("./fileGuard");
const authMiddleware = require("./middleware/auth");
const db = require("./db");
const authRouter = require("./routes/auth");
const driveRouter = require("./routes/drive");
const { router: chatRouter, getOrCreateConversation } = require("./routes/chat");
const vaultRouter = require("./routes/vault");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(cors());

app.use("/auth", express.json());
app.use("/auth", authRouter);

app.use("/drive", express.json());
app.use("/drive", driveRouter);

app.use("/chat", express.json());
app.use("/chat", chatRouter);

app.use("/vault", express.json());
app.use("/vault", vaultRouter);

app.use(
  express.raw({
    type: "*/*",
    limit: "100mb",
  })
);

const encryptedBaseDir = path.join(__dirname, "encrypted");
fs.mkdirSync(encryptedBaseDir, { recursive: true });

function getUserEncryptedDir(userId) {
  const dir = path.join(encryptedBaseDir, String(userId));
  fs.mkdirSync(dir, { recursive: true });
  fs.chmodSync(dir, 0o700);
  return dir;
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    audit("RATE_LIMIT", req, "REJECTED", { route: req.path, reason: "global rate limit exceeded" });
    res.status(429).json({ error: "Too many requests. Please wait a few minutes." });
  },
});

const encryptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    audit("RATE_LIMIT", req, "REJECTED", { route: "/encrypt", reason: "encrypt rate limit exceeded" });
    res.status(429).json({ error: "Too many encryption requests. Please wait." });
  },
});

const decryptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    audit("RATE_LIMIT", req, "REJECTED", { route: "/decrypt", reason: "decrypt rate limit exceeded" });
    res.status(429).json({ error: "Too many decryption attempts. Please wait." });
  },
});

app.use(globalLimiter);

app.post("/encrypt", authMiddleware, encryptLimiter, (req, res) => {
  const filename = req.headers["x-filename"];
  const saveToDrive = req.headers["x-save-to-drive"] === "true";

  if (!filename || !req.body || req.body.length === 0) {
    return res.status(400).json({ error: "File data or filename missing" });
  }

  if (!isExtensionAllowed(filename)) {
    audit("ENCRYPT", req, "REJECTED", { filename, reason: "blocked file extension" });
    return res.status(400).json({
      error: `File type not allowed. The extension "${path.extname(filename).toLowerCase()}" is not on the whitelist.`,
    });
  }

  const magicResult = isMagicBytesAllowed(req.body);
  if (!magicResult.allowed) {
    audit("ENCRYPT", req, "REJECTED", { filename, reason: `magic bytes rejected: ${magicResult.reason}` });
    return res.status(400).json({ error: `File content rejected: ${magicResult.reason}` });
  }

  const originalHash = crypto.createHash("sha256").update(req.body).digest("hex");
  const privateKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", privateKey, iv);
  const encryptedData = Buffer.concat([cipher.update(req.body), cipher.final()]);

  const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(4).toString("hex");
  const encryptedFileName = `${filename}.${uniqueSuffix}.enc`;

  if (saveToDrive) {
    const userDir = getUserEncryptedDir(req.user.id);
    const encryptedPath = path.join(userDir, encryptedFileName);
    fs.writeFileSync(encryptedPath, encryptedData);
    fs.chmodSync(encryptedPath, 0o600);

    const keySha256 = crypto.createHash("sha256").update(privateKey).digest("hex");
    db.prepare(
      `INSERT INTO files (user_id, original_name, stored_name, iv, key_sha256, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, filename, encryptedFileName, iv.toString("hex"), keySha256, encryptedData.length);
  }

  audit("ENCRYPT", req, "SUCCESS", {
    filename,
    encryptedFileName,
    sizeBytes: req.body.length,
    sha256: originalHash,
    savedToDrive: saveToDrive,
  });

  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-Private-Key, X-IV, X-SHA256, X-Encrypted-Filename, X-Secure-Note"
  );
  res.setHeader("X-Private-Key", privateKey.toString("hex"));
  res.setHeader("X-IV", iv.toString("hex"));
  res.setHeader("X-SHA256", originalHash);
  res.setHeader("X-Encrypted-Filename", encryptedFileName);
  res.setHeader("X-Secure-Note", "No plaintext was written to disk.");
  res.setHeader("Content-Disposition", `attachment; filename="${encryptedFileName}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  res.status(200).send(encryptedData);
});

app.post("/decrypt", authMiddleware, decryptLimiter, (req, res) => {
  const keyHex = req.headers["x-private-key"];
  const ivHex = req.headers["x-iv"];
  const originalFilename = req.headers["x-filename"] || "decrypted_file";

  if (!keyHex || !ivHex || !req.body || req.body.length === 0) {
    audit("DECRYPT", req, "REJECTED", { filename: originalFilename, reason: "missing key, IV, or body" });
    return res.status(400).json({ error: "Encrypted file data, private key, or IV missing" });
  }

  try {
    if (keyHex.length !== 64) {
      return res.status(400).json({ error: `Invalid key length: got ${keyHex.length} hex chars, expected 64.` });
    }
    if (ivHex.length !== 32) {
      return res.status(400).json({ error: `Invalid IV length: got ${ivHex.length} hex chars, expected 32.` });
    }

    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.from(ivHex, "hex");

    if (key.length !== 32 || iv.length !== 16) {
      return res.status(400).json({ error: "Key or IV contains invalid hex characters." });
    }

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const decryptedData = Buffer.concat([decipher.update(req.body), decipher.final()]);
    const decryptedHash = crypto.createHash("sha256").update(decryptedData).digest("hex");

    res.setHeader("Access-Control-Expose-Headers", "X-Decrypted-SHA256");
    res.setHeader("X-Decrypted-SHA256", decryptedHash);
    res.setHeader("Content-Disposition", `attachment; filename="${originalFilename}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    audit("DECRYPT", req, "SUCCESS", { filename: originalFilename, sizeBytes: decryptedData.length, sha256: decryptedHash });
    res.status(200).send(decryptedData);
  } catch (err) {
    audit("DECRYPT", req, "FAILURE", { filename: originalFilename, reason: err.message });
    res.status(400).json({ error: "Decryption failed. Check that the key and IV are correct." });
  }
});

app.post("/secure-delete", authMiddleware, (req, res) => {
  const filename = req.headers["x-filename"];

  if (!filename || !filename.endsWith(".enc")) {
    return res.status(400).json({ error: "Only .enc files can be securely deleted" });
  }

  const userDir = getUserEncryptedDir(req.user.id);
  const resolved = path.resolve(userDir, path.basename(filename));

  if (!resolved.startsWith(userDir)) {
    return res.status(403).json({ error: "Path traversal detected" });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: "File not found on server" });
  }

  try {
    const result = secureDelete(resolved);
    db.prepare("DELETE FROM files WHERE stored_name = ? AND user_id = ?").run(filename, req.user.id);
    audit("SECURE_DELETE", req, "SUCCESS", { filename, passes: result.passes, bytesOverwritten: result.bytesOverwritten });
    res.status(200).json({ message: "File securely deleted", passes: result.passes, bytesOverwritten: result.bytesOverwritten });
  } catch (err) {
    audit("SECURE_DELETE", req, "FAILURE", { filename, reason: err.message });
    res.status(500).json({ error: "Secure delete failed: " + err.message });
  }
});

const wss = new WebSocketServer({ server });

const clients = new Map();

function broadcast(userId, payload) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

wss.on("connection", (ws) => {
  let authedUser = null;
  let authTimeout = setTimeout(() => {
    ws.close(4001, "Authentication timeout");
  }, 10000);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
      return;
    }

    if (!authedUser) {
      if (msg.type !== "auth" || !msg.token) {
        ws.send(JSON.stringify({ type: "error", error: "Send auth message first" }));
        return;
      }
      try {
        const payload = jwt.verify(msg.token, process.env.JWT_SECRET);
        authedUser = { id: payload.id, username: payload.username };
        clearTimeout(authTimeout);
        clients.set(authedUser.id, ws);

        ws.send(JSON.stringify({ type: "auth_ok", username: authedUser.username }));

        const contacts = db
          .prepare(
            `SELECT u.id FROM contacts c JOIN users u ON c.contact_id = u.id WHERE c.user_id = ?`
          )
          .all(authedUser.id);

        contacts.forEach(c => {
          broadcast(c.id, { type: "presence", userId: authedUser.id, username: authedUser.username, online: true });
        });
      } catch {
        ws.send(JSON.stringify({ type: "error", error: "Invalid token" }));
        ws.close(4001, "Invalid token");
      }
      return;
    }

    if (msg.type === "send_message") {
      const { toUserId, body, messageType } = msg;
      if (!toUserId || !body) return;

      const convId = getOrCreateConversation(authedUser.id, toUserId);
      const type = messageType || "text";

      const result = db
        .prepare("INSERT INTO messages (conversation_id, sender_id, type, body) VALUES (?, ?, ?, ?)")
        .run(convId, authedUser.id, type, typeof body === "string" ? body : JSON.stringify(body));

      const outMsg = {
        type: "new_message",
        id: result.lastInsertRowid,
        conversation_id: convId,
        sender_id: authedUser.id,
        sender_username: authedUser.username,
        messageType: type,
        body: typeof body === "string" ? body : JSON.stringify(body),
        created_at: Math.floor(Date.now() / 1000),
      };

      ws.send(JSON.stringify(outMsg));
      broadcast(toUserId, outMsg);
    }
  });

  ws.on("close", () => {
    if (authedUser) {
      clients.delete(authedUser.id);
      const contacts = db
        .prepare(
          `SELECT u.id FROM contacts c JOIN users u ON c.contact_id = u.id WHERE c.user_id = ?`
        )
        .all(authedUser.id);
      contacts.forEach(c => {
        broadcast(c.id, { type: "presence", userId: authedUser.id, username: authedUser.username, online: false });
      });
    }
    clearTimeout(authTimeout);
  });
});

server.listen(PORT, () => {
  console.log(`VaultLock server running on port ${PORT} (HTTP + WebSocket)`);
});
