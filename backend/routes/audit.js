const express = require("express");
const fs = require("fs");
const path = require("path");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

const LOG_FILE = path.join(__dirname, "..", "audit.log");

/**
 * GET /audit/logs
 * Returns paginated audit log entries with filtering
 *
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 50, max 100)
 *   - action: filter by action type (ENCRYPT, DECRYPT, SECURE_DELETE, etc.)
 *   - status: filter by status (SUCCESS, REJECTED, FAILURE)
 *   - from: ISO date string for start date filter
 *   - to: ISO date string for end date filter
 */
router.get("/logs", (req, res) => {
  try {
    // Check if log file exists
    if (!fs.existsSync(LOG_FILE)) {
      return res.json({
        logs: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });
    }

    // Read and parse log file (JSON lines format)
    const content = fs.readFileSync(LOG_FILE, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    let logs = lines.map((line, index) => {
      try {
        const parsed = JSON.parse(line);
        return { id: index + 1, ...parsed };
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Apply filters
    const { action, status, from, to } = req.query;

    if (action) {
      logs = logs.filter((log) => log.action === action.toUpperCase());
    }

    if (status) {
      logs = logs.filter((log) => log.status === status.toUpperCase());
    }

    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter((log) => new Date(log.timestamp) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      logs = logs.filter((log) => new Date(log.timestamp) <= toDate);
    }

    // Sort by timestamp descending (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const total = logs.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedLogs = logs.slice(startIndex, endIndex);

    res.json({
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error reading audit logs:", err);
    res.status(500).json({ error: "Failed to read audit logs" });
  }
});

/**
 * GET /audit/stats
 * Returns aggregate statistics for the audit logs
 */
router.get("/stats", (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.json({
        total: 0,
        byAction: {},
        byStatus: {},
        recentActivity: [],
      });
    }

    const content = fs.readFileSync(LOG_FILE, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    const logs = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Aggregate stats
    const byAction = {};
    const byStatus = {};

    logs.forEach((log) => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
    });

    // Get last 24 hours activity
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = logs.filter((log) => new Date(log.timestamp) >= oneDayAgo);

    // Group by hour
    const hourlyActivity = {};
    recentLogs.forEach((log) => {
      const hour = new Date(log.timestamp).toISOString().slice(0, 13);
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    res.json({
      total: logs.length,
      byAction,
      byStatus,
      last24Hours: recentLogs.length,
      hourlyActivity,
    });
  } catch (err) {
    console.error("Error computing audit stats:", err);
    res.status(500).json({ error: "Failed to compute audit statistics" });
  }
});

/**
 * GET /audit/export
 * Export audit logs as downloadable JSON
 */
router.get("/export", (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.json([]);
    }

    const content = fs.readFileSync(LOG_FILE, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    const logs = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Apply date filters if provided
    const { from, to } = req.query;
    let filtered = logs;

    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter((log) => new Date(log.timestamp) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      filtered = filtered.filter((log) => new Date(log.timestamp) <= toDate);
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="vaultlock-audit-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(filtered);
  } catch (err) {
    console.error("Error exporting audit logs:", err);
    res.status(500).json({ error: "Failed to export audit logs" });
  }
});

module.exports = router;

