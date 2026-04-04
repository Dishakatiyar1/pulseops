const pool = require("../db/pool");

// GET /api/anomalies
async function getAnomalies(req, res) {
  try {
    const { gym_id, severity } = req.query;
    let query = `
      SELECT a.*, g.name AS gym_name
      FROM anomalies a JOIN gyms g ON g.id = a.gym_id
      WHERE a.resolved = FALSE
    `;
    const params = [];
    if (gym_id) {
      params.push(gym_id);
      query += ` AND a.gym_id = $${params.length}`;
    }
    if (severity) {
      params.push(severity);
      query += ` AND a.severity = $${params.length}`;
    }
    query += " ORDER BY a.detected_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/anomalies/:id/dismiss
async function dismissAnomaly(req, res) {
  try {
    const { id } = req.params;
    const check = await pool.query("SELECT * FROM anomalies WHERE id = $1", [
      id,
    ]);
    if (!check.rows[0])
      return res.status(404).json({ error: "Anomaly not found" });
    if (check.rows[0].severity === "critical")
      return res
        .status(403)
        .json({ error: "Critical anomalies cannot be dismissed" });

    const result = await pool.query(
      "UPDATE anomalies SET dismissed = TRUE WHERE id = $1 RETURNING *",
      [id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAnomalies, dismissAnomaly };
