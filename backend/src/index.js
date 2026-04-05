require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { initWebSocket } = require("./websocket/broadcaster");
const { startAnomalyDetector } = require("./jobs/anomalyDetector");
// const { startSimulator } = require("./services/simulatorService");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRouter = require("./routes/auth");
const gymsRouter = require("./routes/gyms");
const analyticsRouter = require("./routes/analytics");
const anomaliesRouter = require("./routes/anomalies");
const simulatorRouter = require("./routes/simulator");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// serurity middlewares
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })); // 100 requests per 15 minutes
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://dishakatiyar1-pulseops.vercel.app",
    ],
    credentials: true,
  }),
);
app.use(express.json());

// Health
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/gyms", gymsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/anomalies", anomaliesRouter);
app.use("/api/simulator", simulatorRouter);

// Legacy support for your existing /gyms/:id/occupancy
app.use("/gyms", gymsRouter);

// Init WebSocket on the same HTTP server
initWebSocket(server);

// Start background jobs after DB is ready
startAnomalyDetector();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
