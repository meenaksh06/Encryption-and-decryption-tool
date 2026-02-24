const express = require("express");
const path = require("path");
const fs = require("fs");
const { secureDelete } = require("../secureDelete");
const { audit } = require("../audit");
const db = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

router.get("/files", (req, res) => {
  const files = db
    .prepare(
      `SELECT id, original_name, stored_name, size_bytes, created_at
       FROM files WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(req.user.id);

  res.json(files);
});

router.get("/download/:storedName", (req, res) => {
  const { storedName } = req.params;

  const record = db
    .prepare("SELECT * FROM files WHERE stored_name = ? AND user_id = ?")
    .get(storedName, req.user.id);

  if (!record) {
    return res.status(404).json({ error: "File not found" });
  }

  const encryptedDir = path.join(__dirname, "..", "encrypted", String(req.user.id));
  const filePath = path.resolve(encryptedDir, storedName);

  if (!filePath.startsWith(encryptedDir)) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found on disk" });
  }

  res.setHeader("Content-Disposition", `attachment; filename="${record.stored_name}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
});

router.patch("/rename/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { newName } = req.body;

  if (!newName || typeof newName !== "string" || newName.trim().length === 0) {
    return res.status(400).json({ error: "newName is required" });
  }

  const record = db
    .prepare("SELECT id FROM files WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);

  if (!record) {
    return res.status(404).json({ error: "File not found" });
  }

  db.prepare("UPDATE files SET original_name = ? WHERE id = ?").run(newName.trim(), id);

  res.json({ message: "File renamed successfully" });
});

router.delete("/delete/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);

  const record = db
    .prepare("SELECT * FROM files WHERE id = ? AND user_id = ?")
    .get(id, req.user.id);

  if (!record) {
    return res.status(404).json({ error: "File not found" });
  }

  const encryptedDir = path.join(__dirname, "..", "encrypted", String(req.user.id));
  const filePath = path.resolve(encryptedDir, record.stored_name);

  if (!filePath.startsWith(encryptedDir)) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    if (fs.existsSync(filePath)) {
      const result = secureDelete(filePath);
      audit("SECURE_DELETE", req, "SUCCESS", {
        filename: record.stored_name,
        passes: result.passes,
        bytesOverwritten: result.bytesOverwritten,
      });
    }

    db.prepare("DELETE FROM files WHERE id = ?").run(id);
    res.json({ message: "File securely deleted" });
  } catch (err) {
    audit("SECURE_DELETE", req, "FAILURE", { filename: record.stored_name, reason: err.message });
    res.status(500).json({ error: "Secure delete failed: " + err.message });
  }
});

module.exports = router;
