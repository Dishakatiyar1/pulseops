const BASE = "http://localhost:5000/api";

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  // Gyms
  getGyms: () => req("/gyms"),
  getGymLive: (id) => req(`/gyms/${id}/live`),
  getGymAnalytics: (id, dateRange = "30d") =>
    req(`/gyms/${id}/analytics?dateRange=${dateRange}`),

  // Analytics
  getCrossGymRevenue: () => req("/analytics/cross-gym"),

  // Anomalies
  getAnomalies: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/anomalies${qs ? "?" + qs : ""}`);
  },
  dismissAnomaly: (id) => req(`/anomalies/${id}/dismiss`, { method: "PATCH" }),

  // Simulator
  startSimulator: (speed = 1) =>
    req("/simulator/start", {
      method: "POST",
      body: JSON.stringify({ speed }),
    }),
  stopSimulator: () => req("/simulator/stop", { method: "POST" }),
  resetSimulator: () => req("/simulator/reset", { method: "POST" }),

  // login
  login: (email, password) =>
    req("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // register
  register: (form) =>
    req("/auth/register", {
      method: "POST",
      body: JSON.stringify(form),
    }),

  // ai insights
  getAnomalyInsight: (id) => req(`/anomalies/${id}/insight`),
};
