const pool = require("../db/pool");

// GET /api/gyms — all gyms with live occupancy + today's revenue
async function getAllGyms(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        g.id, g.name, g.city, g.capacity, g.status, g.opens_at, g.closes_at,
        COALESCE(occ.count, 0)    AS current_occupancy,
        COALESCE(rev.total, 0)    AS today_revenue,
        ROUND(COALESCE(occ.count, 0) * 100.0 / g.capacity, 1) AS occupancy_pct
      FROM gyms g
      LEFT JOIN (
        SELECT gym_id, COUNT(*)::int AS count
        FROM checkins WHERE checked_out IS NULL
        GROUP BY gym_id
      ) occ ON occ.gym_id = g.id
      LEFT JOIN (
        SELECT gym_id, SUM(amount) AS total
        FROM payments WHERE paid_at >= CURRENT_DATE
        GROUP BY gym_id
      ) rev ON rev.gym_id = g.id
      ORDER BY g.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/gyms/:id/live — single gym snapshot < 5ms
async function getGymLive(req, res) {
  try {
    const { id } = req.params;

    const [gymRes, occRes, revRes, eventsRes, anomaliesRes] = await Promise.all(
      [
        pool.query("SELECT * FROM gyms WHERE id = $1", [id]),
        pool.query(
          "SELECT COUNT(*)::int AS count FROM checkins WHERE gym_id = $1 AND checked_out IS NULL",
          [id],
        ),
        pool.query(
          "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE",
          [id],
        ),
        pool.query(
          `
        SELECT 'checkin' AS type, m.name AS member_name, c.checked_in AS ts
        FROM checkins c JOIN members m ON m.id = c.member_id
        WHERE c.gym_id = $1
        ORDER BY c.checked_in DESC LIMIT 10
      `,
          [id],
        ),
        pool.query(
          "SELECT * FROM anomalies WHERE gym_id = $1 AND resolved = FALSE ORDER BY detected_at DESC",
          [id],
        ),
      ],
    );

    if (!gymRes.rows[0])
      return res.status(404).json({ error: "Gym not found" });

    const gym = gymRes.rows[0];
    const occ = occRes.rows[0].count;
    const revenue = parseFloat(revRes.rows[0].total);

    res.json({
      ...gym,
      current_occupancy: occ,
      occupancy_pct: Math.round((occ / gym.capacity) * 1000) / 10,
      today_revenue: revenue,
      recent_events: eventsRes.rows,
      active_anomalies: anomaliesRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /gyms/:id/occupancy — legacy endpoint you already had
async function getOccupancy(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM checkins WHERE gym_id = $1 AND checked_out IS NULL",
      [id],
    );
    res.json({ gym_id: id, occupancy: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAllGyms, getGymLive, getOccupancy };
