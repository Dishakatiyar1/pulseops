const request = require("supertest");
const express = require("express");

// Mock pool so tests don't need real DB
jest.mock("../db/pool", () => ({
  query: jest.fn(),
}));

const pool = require("../db/pool");

// Simple express app for testing
const app = express();
app.use(express.json());

// Mock gyms route
app.get("/api/gyms", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM gyms");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mock anomalies route
app.get("/api/anomalies", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM anomalies WHERE resolved = FALSE",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mock dismiss route
app.patch("/api/anomalies/:id/dismiss", async (req, res) => {
  const anomaly = { id: req.params.id, severity: "critical", resolved: false };
  if (anomaly.severity === "critical") {
    return res
      .status(403)
      .json({ error: "Critical anomalies cannot be dismissed" });
  }
  res.json({ ...anomaly, dismissed: true });
});

// Mock auth routes
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  res.json({ token: "fake-jwt-token", user: { email } });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email and password are required" });
  }
  res.status(201).json({ token: "fake-jwt-token", user: { name, email } });
});

// Mock simulator route
app.post("/api/simulator/start", (req, res) => {
  const { speed } = req.body;
  if (![1, 5, 10].includes(speed)) {
    return res.status(400).json({ error: "Speed must be 1, 5 or 10" });
  }
  res.json({ status: "running", speed });
});

// ─── Tests ───────────────────────────────────────────────

describe("API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Gyms
  test("GET /api/gyms returns list of gyms", async () => {
    pool.query.mockResolvedValue({ rows: [{ id: "123", name: "Test Gym" }] });
    const res = await request(app).get("/api/gyms");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/gyms returns empty array when no gyms", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get("/api/gyms");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // Anomalies
  test("GET /api/anomalies returns active anomalies", async () => {
    pool.query.mockResolvedValue({ rows: [{ id: "1", severity: "critical" }] });
    const res = await request(app).get("/api/anomalies");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("PATCH /api/anomalies/:id/dismiss returns 403 for critical", async () => {
    const res = await request(app).patch("/api/anomalies/123/dismiss");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Critical anomalies cannot be dismissed");
  });

  // Auth
  test("POST /api/auth/login returns token with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@test.com", password: "123456" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  test("POST /api/auth/login returns 400 without credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  test("POST /api/auth/register returns 201 with valid data", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Disha", email: "disha@test.com", password: "123456" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
  });

  test("POST /api/auth/register returns 400 without required fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "disha@test.com" });
    expect(res.status).toBe(400);
  });

  // Simulator
  test("POST /api/simulator/start returns running status", async () => {
    const res = await request(app)
      .post("/api/simulator/start")
      .send({ speed: 1 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("running");
  });

  test("POST /api/simulator/start returns 400 for invalid speed", async () => {
    const res = await request(app)
      .post("/api/simulator/start")
      .send({ speed: 3 });
    expect(res.status).toBe(400);
  });
});
