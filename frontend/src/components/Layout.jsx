import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "../utils/api";
import Sidebar from "./Sidebar";
import Dashboard from "../pages/Dashboard";
import Gyms from "../pages/Gyms";
import GymDetail from "../pages/GymDetail";
import Anomalies from "../pages/Anomalies";
import Analytics from "../pages/Analytics";
import Simulator from "../pages/Simulator";
import { useState } from "react";
import { useEffect } from "react";

function AppLayout() {
  const [anomalyCount, setAnomalyCount] = useState(0);

  useEffect(() => {
    const fetchAnomalies = () => {
      api
        .getAnomalies()
        .then((a) => setAnomalyCount(a.length))
        .catch(() => {});
    };

    fetchAnomalies();
    const t = setInterval(fetchAnomalies, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar anomalyCount={anomalyCount} />
      <main className="flex-1 ml-16 lg:ml-56 min-h-screen">
        {/* Top gradient accent */}
        <div
          className="fixed top-0 left-16 lg:left-56 right-0 h-px z-30"
          style={{ background: "linear-gradient(90deg, #f97316, transparent)" }}
        />
        <div className="p-5 lg:p-7 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/gyms" element={<Gyms />} />
            <Route path="/gyms/:id" element={<GymDetail />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/simulator" element={<Simulator />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
