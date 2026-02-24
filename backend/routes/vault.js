const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

router.get("/salt", (req, res) => {
  let user = db.prepare("SELECT vault_salt FROM users WHERE id = ?").get(req.user.id);
  if (!user.vault_salt) {
    const salt = crypto.randomBytes(16).toString("base64");
    db.prepare("UPDATE users SET vault_salt = ? WHERE id = ?").run(salt, req.user.id);
    user = { vault_salt: salt };
  }
  res.json({ salt: user.vault_salt });
});

router.get("/entries", (req, res) => {
  const entries = db
    .prepare(
      "SELECT id, label, encrypted_data, enc_iv, created_at FROM key_vault WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(req.user.id);
  res.json(entries);
});

router.post("/entries", (req, res) => {
  const { label, encrypted_data, enc_iv } = req.body;
  if (!label || !encrypted_data || !enc_iv) {
    return res.status(400).json({ error: "label, encrypted_data, and enc_iv are required" });
  }
  const result = db
    .prepare(
      "INSERT INTO key_vault (user_id, label, encrypted_data, enc_iv) VALUES (?, ?, ?, ?)"
    )
    .run(req.user.id, label, encrypted_data, enc_iv);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete("/entries/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const entry = db
    .prepare("SELECT id FROM key_vault WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  db.prepare("DELETE FROM key_vault WHERE id = ?").run(id);
  res.json({ message: "Entry deleted" });
});

module.exports = router;
