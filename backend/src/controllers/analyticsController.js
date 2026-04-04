const pool = require("../db/pool");

// GET /api/gyms/:id/analytics?dateRange=30d
async function getGymAnalytics(req, res) {
  try {
    const { id } = req.params;
    const days =
      req.query.dateRange === "90d"
        ? 90
        : req.query.dateRange === "7d"
          ? 7
          : 30;

    const [heatmap, revenue, churn, ratio] = await Promise.all([
      // Q4: Peak hours heatmap from materialized view
      pool.query(
        "SELECT day_of_week, hour_of_day, checkin_count FROM gym_hourly_stats WHERE gym_id = $1",
        [id],
      ),
      // Q2: Revenue by plan type
      pool.query(
        `SELECT plan_type, SUM(amount) AS total, COUNT(*) AS count
         FROM payments
         WHERE gym_id = $1 AND paid_at >= NOW() - ($2 || ' days')::interval
         GROUP BY plan_type`,
        [id, days],
      ),
      // Q3: Churn risk — uses partial index idx_members_churn_risk
      pool.query(
        `SELECT id, name, last_checkin_at,
           CASE WHEN last_checkin_at < NOW() - INTERVAL '60 days' THEN 'CRITICAL'
                ELSE 'HIGH' END AS risk_level
         FROM members
         WHERE gym_id = $1 AND status = 'active'
           AND last_checkin_at < NOW() - INTERVAL '45 days'
         ORDER BY last_checkin_at ASC`,
        [id],
      ),
      // A-04: New vs renewal ratio
      pool.query(
        `SELECT member_type, COUNT(*) AS count
         FROM members
         WHERE gym_id = $1 AND joined_at >= NOW() - ($2 || ' days')::interval
         GROUP BY member_type`,
        [id, days],
      ),
    ]);

    res.json({
      heatmap: heatmap.rows,
      revenue_by_plan: revenue.rows,
      churn_risk: churn.rows,
      member_ratio: ratio.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/analytics/cross-gym — Q5: all gyms ranked by 30d revenue
async function getCrossGymRevenue(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        g.id AS gym_id, g.name AS gym_name, g.city,
        COALESCE(SUM(p.amount), 0) AS total_revenue,
        RANK() OVER (ORDER BY COALESCE(SUM(p.amount), 0) DESC) AS rank
      FROM gyms g
      LEFT JOIN payments p ON p.gym_id = g.id AND p.paid_at >= NOW() - INTERVAL '30 days'
      GROUP BY g.id, g.name, g.city
      ORDER BY total_revenue DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getGymAnalytics, getCrossGymRevenue };
