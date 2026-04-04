const { detectAnomalies } = require("../services/anomalyService");

let intervalHandle = null;

function startAnomalyDetector(intervalMs = 30000) {
  if (intervalHandle) return;
  console.log("Anomaly detector started (every 30s)");
  // Run immediately on startup, then every 30s
  detectAnomalies();
  intervalHandle = setInterval(detectAnomalies, intervalMs);
}

function stopAnomalyDetector() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { startAnomalyDetector, stopAnomalyDetector };
