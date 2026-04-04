const express = require("express");
const {
  getAnomalies,
  dismissAnomaly,
} = require("../controllers/anomalyController");
const pool = require("../db/pool");
const { generateAnomalyInsight } = require("../services/aiService");

const router = express.Router();

router.get("/", getAnomalies);
router.patch("/:id/dismiss", dismissAnomaly);

router.get("/:id/insight", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, g.name AS gym_name 
       FROM anomalies a 
       JOIN gyms g ON g.id = a.gym_id 
       WHERE a.id = $1`,
      [id],
    );
    if (!result.rows[0])
      return res.status(404).json({ error: "Anomaly not found" });

    const insight = await generateAnomalyInsight(result.rows[0]);
    res.json({ insight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
