const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

router.post("/key", (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey || typeof publicKey !== "string") {
    return res.status(400).json({ error: "publicKey is required" });
  }
  db.prepare("UPDATE users SET public_key = ? WHERE id = ?").run(publicKey, req.user.id);
  res.json({ message: "Public key saved" });
});

router.get("/users/:username/pubkey", (req, res) => {
  const user = db
    .prepare("SELECT id, username, public_key FROM users WHERE username = ?")
    .get(req.params.username);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!user.public_key) return res.status(404).json({ error: "User has no public key yet" });
  res.json({ id: user.id, username: user.username, publicKey: user.public_key });
});

router.get("/contacts", (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.public_key
       FROM contacts c JOIN users u ON c.contact_id = u.id
       WHERE c.user_id = ? ORDER BY u.username`
    )
    .all(req.user.id);
  res.json(rows);
});

router.post("/contacts", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username is required" });

  const target = db.prepare("SELECT id, username FROM users WHERE username = ?").get(username);
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.id === req.user.id) return res.status(400).json({ error: "Cannot add yourself" });

  const existing = db
    .prepare("SELECT id FROM contacts WHERE user_id = ? AND contact_id = ?")
    .get(req.user.id, target.id);
  if (existing) return res.status(409).json({ error: "Already a contact" });

  db.prepare("INSERT INTO contacts (user_id, contact_id) VALUES (?, ?)").run(req.user.id, target.id);
  db.prepare("INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)").run(target.id, req.user.id);

  res.status(201).json({ id: target.id, username: target.username });
});

router.delete("/contacts/:id", (req, res) => {
  const contactId = parseInt(req.params.id, 10);
  db.prepare("DELETE FROM contacts WHERE user_id = ? AND contact_id = ?").run(req.user.id, contactId);
  res.json({ message: "Contact removed" });
});

function getOrCreateConversation(userA, userB) {
  const a = Math.min(userA, userB);
  const b = Math.max(userA, userB);
  let conv = db.prepare("SELECT id FROM conversations WHERE user_a = ? AND user_b = ?").get(a, b);
  if (!conv) {
    const result = db.prepare("INSERT INTO conversations (user_a, user_b) VALUES (?, ?)").run(a, b);
    conv = { id: result.lastInsertRowid };
  }
  return conv.id;
}

router.get("/conversations", (req, res) => {
  const uid = req.user.id;
  const convos = db
    .prepare(
      `SELECT c.id, c.user_a, c.user_b,
              ua.username AS username_a, ub.username AS username_b,
              (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
              (SELECT type FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_type,
              (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_at
       FROM conversations c
       JOIN users ua ON c.user_a = ua.id
       JOIN users ub ON c.user_b = ub.id
       WHERE c.user_a = ? OR c.user_b = ?
       ORDER BY last_at DESC`
    )
    .all(uid, uid);

  const result = convos.map(c => ({
    id: c.id,
    peer: c.user_a === uid
      ? { id: c.user_b, username: c.username_b }
      : { id: c.user_a, username: c.username_a },
    lastMessage: c.last_message,
    lastType: c.last_type,
    lastAt: c.last_at,
  }));

  res.json(result);
});

router.get("/conversations/:id/messages", (req, res) => {
  const convId = parseInt(req.params.id, 10);
  const conv = db
    .prepare("SELECT * FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)")
    .get(convId, req.user.id, req.user.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const msgs = db
    .prepare(
      `SELECT m.id, m.sender_id, u.username AS sender_username, m.type, m.body, m.created_at
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.id DESC LIMIT 50`
    )
    .all(convId)
    .reverse();

  res.json(msgs);
});

router.post("/conversations/:peerId/send", (req, res) => {
  const peerId = parseInt(req.params.peerId, 10);
  const { type, body } = req.body;
  if (!body) return res.status(400).json({ error: "body is required" });

  const convId = getOrCreateConversation(req.user.id, peerId);
  const result = db
    .prepare("INSERT INTO messages (conversation_id, sender_id, type, body) VALUES (?, ?, ?, ?)")
    .run(convId, req.user.id, type || "text", body);

  const msg = {
    id: result.lastInsertRowid,
    conversation_id: convId,
    sender_id: req.user.id,
    sender_username: req.user.username,
    type: type || "text",
    body,
    created_at: Math.floor(Date.now() / 1000),
  };

  res.status(201).json(msg);
});

module.exports = { router, getOrCreateConversation };
