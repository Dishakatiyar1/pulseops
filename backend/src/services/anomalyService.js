const pool = require("../db/pool");
const { broadcast } = require("../websocket/broadcaster");

async function detectAnomalies() {
  try {
    const gyms = await pool.query(
      "SELECT id, name, capacity, status, opens_at, closes_at FROM gyms WHERE status = 'active'",
    );

    for (const gym of gyms.rows) {
      await checkZeroCheckins(gym);
      await checkCapacityBreach(gym);
      await checkRevenueDrop(gym);
      await autoResolveAnomalies(gym);
    }
  } catch (err) {
    console.error("Anomaly detection error:", err.message);
  }
}

async function checkZeroCheckins(gym) {
  const now = new Date();
  const hour = now.getHours();
  const opensHour = parseInt(gym.opens_at.split(":")[0]);
  const closesHour = parseInt(gym.closes_at.split(":")[0]);

  if (hour < opensHour || hour >= closesHour) return;

  const res = await pool.query(
    `SELECT COUNT(*)::int AS count FROM checkins
     WHERE gym_id = $1 AND checked_in > NOW() - INTERVAL '2 hours'`,
    [gym.id],
  );

  if (res.rows[0].count === 0) {
    await upsertAnomaly(
      gym,
      "zero_checkins",
      "warning",
      `No check-ins at ${gym.name} for over 2 hours during operating hours`,
    );
  }
}

async function checkCapacityBreach(gym) {
  const res = await pool.query(
    "SELECT COUNT(*)::int AS count FROM checkins WHERE gym_id = $1 AND checked_out IS NULL",
    [gym.id],
  );
  const pct = res.rows[0].count / gym.capacity;

  if (pct > 0.9) {
    await upsertAnomaly(
      gym,
      "capacity_breach",
      "critical",
      `${gym.name} at ${Math.round(pct * 100)}% capacity (${res.rows[0].count}/${gym.capacity} members)`,
    );
  }
}

async function checkRevenueDrop(gym) {
  const res = await pool.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN paid_at >= CURRENT_DATE THEN amount END), 0) AS today,
      COALESCE(SUM(CASE WHEN paid_at::date = (CURRENT_DATE - INTERVAL '7 days')::date THEN amount END), 0) AS last_week
    FROM payments WHERE gym_id = $1
      AND paid_at >= CURRENT_DATE - INTERVAL '8 days'
  `,
    [gym.id],
  );

  const { today, last_week } = res.rows[0];
  if (
    parseFloat(last_week) > 0 &&
    parseFloat(today) < parseFloat(last_week) * 0.7
  ) {
    await upsertAnomaly(
      gym,
      "revenue_drop",
      "warning",
      `${gym.name} revenue today (₹${today}) is >30% below same day last week (₹${last_week})`,
    );
  }
}

async function upsertAnomaly(gym, type, severity, message) {
  // Avoid duplicate active anomalies of same type for same gym
  const existing = await pool.query(
    "SELECT id FROM anomalies WHERE gym_id = $1 AND type = $2 AND resolved = FALSE",
    [gym.id, type],
  );
  if (existing.rows.length > 0) return;

  const result = await pool.query(
    `INSERT INTO anomalies (gym_id, type, severity, message)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [gym.id, type, severity, message],
  );

  broadcast({
    type: "ANOMALY_DETECTED",
    anomaly_id: result.rows[0].id,
    gym_id: gym.id,
    gym_name: gym.name,
    anomaly_type: type,
    severity,
    message,
  });
}

async function autoResolveAnomalies(gym) {
  const active = await pool.query(
    "SELECT * FROM anomalies WHERE gym_id = $1 AND resolved = FALSE",
    [gym.id],
  );

  for (const anomaly of active.rows) {
    let shouldResolve = false;

    if (anomaly.type === "zero_checkins") {
      const res = await pool.query(
        "SELECT COUNT(*)::int AS count FROM checkins WHERE gym_id = $1 AND checked_in > NOW() - INTERVAL '2 hours'",
        [gym.id],
      );
      shouldResolve = res.rows[0].count > 0;
    }

    if (anomaly.type === "capacity_breach") {
      const res = await pool.query(
        "SELECT COUNT(*)::int AS count FROM checkins WHERE gym_id = $1 AND checked_out IS NULL",
        [gym.id],
      );
      shouldResolve = res.rows[0].count / gym.capacity < 0.85;
    }

    if (anomaly.type === "revenue_drop") {
      const res = await pool.query(
        `
        SELECT
          COALESCE(SUM(CASE WHEN paid_at >= CURRENT_DATE THEN amount END), 0) AS today,
          COALESCE(SUM(CASE WHEN paid_at::date = (CURRENT_DATE - INTERVAL '7 days')::date THEN amount END), 0) AS last_week
        FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE - INTERVAL '8 days'
      `,
        [gym.id],
      );
      const { today, last_week } = res.rows[0];
      shouldResolve =
        parseFloat(last_week) === 0 ||
        parseFloat(today) >= parseFloat(last_week) * 0.8;
    }

    if (shouldResolve) {
      const resolved = await pool.query(
        "UPDATE anomalies SET resolved = TRUE, resolved_at = NOW() WHERE id = $1 RETURNING *",
        [anomaly.id],
      );
      broadcast({
        type: "ANOMALY_RESOLVED",
        anomaly_id: anomaly.id,
        gym_id: gym.id,
        resolved_at: resolved.rows[0].resolved_at,
      });
    }
  }
}

module.exports = { detectAnomalies };
