const pool = require("../db/pool");
const { broadcast } = require("../websocket/broadcaster");

let simInterval = null;
let simSpeed = 1;

// Weighted hour selector matching spec multipliers
function getRealisticHour() {
  const r = Math.random();
  if (r < 0.16) return 5 + Math.random(); // 05:30-06:59 (0.6x)
  if (r < 0.427) return 7 + Math.random() * 3; // 07:00-09:59 (1.0x PEAK)
  if (r < 0.533) return 10 + Math.random() * 2; // 10:00-11:59 (0.4x)
  if (r < 0.613) return 12 + Math.random() * 2; // 12:00-13:59 (0.3x)
  if (r < 0.667) return 14 + Math.random() * 3; // 14:00-16:59 (0.2x)
  if (r < 0.907) return 17 + Math.random() * 4; // 17:00-20:59 (0.9x PEAK)
  return 21 + Math.random() * 1.5; // 21:00-22:30 (0.35x)
}

async function simulateTick() {
  try {
    // Pick a random gym
    const gymRes = await pool.query(
      "SELECT * FROM gyms ORDER BY random() LIMIT 1",
    );
    const gym = gymRes.rows[0];

    // 60% chance of check-in, 40% chance of check-out of existing open session
    const action = Math.random() < 0.6 ? "checkin" : "checkout";

    if (action === "checkin") {
      const memberRes = await pool.query(
        `SELECT id, name FROM members
         WHERE gym_id = $1 AND status = 'active'
           AND id NOT IN (SELECT member_id FROM checkins WHERE gym_id = $1 AND checked_out IS NULL)
         ORDER BY random() LIMIT 1`,
        [gym.id],
      );
      if (!memberRes.rows[0]) return;
      const member = memberRes.rows[0];

      await pool.query(
        "INSERT INTO checkins (member_id, gym_id, checked_in) VALUES ($1, $2, NOW())",
        [member.id, gym.id],
      );
      await pool.query(
        "UPDATE members SET last_checkin_at = NOW() WHERE id = $1",
        [member.id],
      );

      const occ = await pool.query(
        "SELECT COUNT(*)::int AS count FROM checkins WHERE gym_id = $1 AND checked_out IS NULL",
        [gym.id],
      );

      broadcast({
        type: "CHECKIN_EVENT",
        gym_id: gym.id,
        member_name: member.name,
        timestamp: new Date().toISOString(),
        current_occupancy: occ.rows[0].count,
        capacity_pct:
          Math.round((occ.rows[0].count / gym.capacity) * 1000) / 10,
      });
    } else {
      // Check out the oldest open session at this gym
      const openRes = await pool.query(
        `SELECT c.id, m.name AS member_name FROM checkins c
         JOIN members m ON m.id = c.member_id
         WHERE c.gym_id = $1 AND c.checked_out IS NULL
         ORDER BY c.checked_in ASC LIMIT 1`,
        [gym.id],
      );
      if (!openRes.rows[0]) return;
      const session = openRes.rows[0];

      await pool.query(
        "UPDATE checkins SET checked_out = NOW() WHERE id = $1",
        [session.id],
      );

      const occ = await pool.query(
        "SELECT COUNT(*)::int AS count FROM checkins WHERE gym_id = $1 AND checked_out IS NULL",
        [gym.id],
      );

      broadcast({
        type: "CHECKOUT_EVENT",
        gym_id: gym.id,
        member_name: session.member_name,
        timestamp: new Date().toISOString(),
        current_occupancy: occ.rows[0].count,
        capacity_pct:
          Math.round((occ.rows[0].count / gym.capacity) * 1000) / 10,
      });
    }
  } catch (err) {
    console.error("Simulator tick error:", err.message);
  }
}

// Occasionally simulate a new payment
async function simulatePayment() {
  try {
    const res = await pool.query(
      "SELECT m.*, g.name AS gym_name FROM members m JOIN gyms g ON g.id = m.gym_id WHERE m.status = 'active' ORDER BY random() LIMIT 1",
    );
    if (!res.rows[0]) return;
    const m = res.rows[0];
    const amount =
      m.plan_type === "monthly"
        ? 1499
        : m.plan_type === "quarterly"
          ? 3999
          : 11999;

    await pool.query(
      "INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type) VALUES ($1, $2, $3, $4, 'new')",
      [m.id, m.gym_id, amount, m.plan_type],
    );

    const todayTotal = await pool.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE",
      [m.gym_id],
    );

    broadcast({
      type: "PAYMENT_EVENT",
      gym_id: m.gym_id,
      amount,
      plan_type: m.plan_type,
      member_name: m.name,
      today_total: parseFloat(todayTotal.rows[0].total),
    });
  } catch (err) {
    console.error("Payment sim error:", err.message);
  }
}

function startSim(req, res) {
  const speed = req.body?.speed || 1;
  simSpeed = [1, 5, 10].includes(speed) ? speed : 1;

  if (simInterval) clearInterval(simInterval);

  const tickMs = Math.floor(2000 / simSpeed);
  simInterval = setInterval(async () => {
    await simulateTick();
    // 10% chance of payment per tick
    if (Math.random() < 0.1) await simulatePayment();
  }, tickMs);

  console.log(
    `Simulator started at ${simSpeed}x speed (tick every ${tickMs}ms)`,
  );
  res?.json({ status: "running", speed: simSpeed });
}

function stopSim(req, res) {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
  res?.json({ status: "paused" });
}

async function resetSim(req, res) {
  stopSim(null, null);
  try {
    await pool.query(
      "UPDATE checkins SET checked_out = NOW() WHERE checked_out IS NULL",
    );
    res?.json({ status: "reset" });
  } catch (err) {
    res?.status(500).json({ error: err.message });
  }
}

// Export for routes
module.exports = { startSim, stopSim, resetSim, startSimulator: () => {} };
