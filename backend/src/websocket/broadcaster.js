const WebSocket = require("ws");

let wss = null;

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    ws.send(
      JSON.stringify({ type: "CONNECTED", message: "PulseOps connected" }),
    );

    ws.on("close", () => console.log("WebSocket client disconnected"));
    ws.on("error", (err) => console.error("WebSocket error:", err.message));
  });

  console.log("WebSocket server ready on /ws");
}

function broadcast(event) {
  if (!wss) return;
  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

module.exports = { initWebSocket, broadcast };
