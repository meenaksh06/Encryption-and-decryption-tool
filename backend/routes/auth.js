const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const SALT_ROUNDS = 12;

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ error: "Username must be 3–32 characters" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db
      .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
      .run(username, password_hash);

    const token = jwt.sign(
      { id: result.lastInsertRowid, username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.status(201).json({ message: "User registered successfully", token, username });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  try {
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Change password (requires authentication)
router.post("/change-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new passwords are required" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, req.user.id);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Get current user info
router.get("/me", authMiddleware, (req, res) => {
  const user = db.prepare("SELECT id, username, created_at FROM users WHERE id = ?").get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Get file count
  const fileCount = db.prepare("SELECT COUNT(*) as count FROM files WHERE user_id = ?").get(req.user.id);

  // Get vault entry count
  const vaultCount = db.prepare("SELECT COUNT(*) as count FROM key_vault WHERE user_id = ?").get(req.user.id);

  res.json({
    id: user.id,
    username: user.username,
    createdAt: user.created_at,
    stats: {
      files: fileCount?.count || 0,
      vaultEntries: vaultCount?.count || 0,
    },
  });
});

// Delete account
router.delete("/account", authMiddleware, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password confirmation required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Password is incorrect" });
    }

    // Delete user (cascades to files, vault entries, etc. due to foreign keys)
    db.prepare("DELETE FROM users WHERE id = ?").run(req.user.id);

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;
