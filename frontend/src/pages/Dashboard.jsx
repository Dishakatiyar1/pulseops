import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import { useWs } from "../context/WsContext";
import { useToast } from "../context/ToastContext";
import StatCard from "../components/StatCard";
import CapacityBar from "../components/CapacityBar";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

export default function Dashboard() {
  const [gyms, setGyms] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [crossGym, setCrossGym] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flashedGyms, setFlashedGyms] = useState({});
  const { subscribe, events } = useWs();
  const { addToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [g, a, cg] = await Promise.all([
        api.getGyms(),
        api.getAnomalies(),
        api.getCrossGymRevenue(),
      ]);
      setGyms(g);
      setAnomalies(a);
      setCrossGym(cg);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live updates via WS
  useEffect(() => {
    const unsubs = [
      subscribe("CHECKIN_EVENT", (data) => {
        setGyms((prev) =>
          prev.map((g) =>
            g.id === data.gym_id
              ? {
                  ...g,
                  current_occupancy: data.current_occupancy,
                  occupancy_pct: data.capacity_pct,
                }
              : g,
          ),
        );
        setFlashedGyms((prev) => ({ ...prev, [data.gym_id]: Date.now() }));
        setTimeout(
          () =>
            setFlashedGyms((prev) => {
              const n = { ...prev };
              delete n[data.gym_id];
              return n;
            }),
          1000,
        );
      }),
      subscribe("CHECKOUT_EVENT", (data) => {
        setGyms((prev) =>
          prev.map((g) =>
            g.id === data.gym_id
              ? {
                  ...g,
                  current_occupancy: data.current_occupancy,
                  occupancy_pct: data.capacity_pct,
                }
              : g,
          ),
        );
      }),
      subscribe("PAYMENT_EVENT", (data) => {
        setGyms((prev) =>
          prev.map((g) =>
            g.id === data.gym_id
              ? { ...g, today_revenue: data.today_total }
              : g,
          ),
        );
        addToast({
          type: "payment",
          title: "Payment received",
          message: `₹${data.amount.toLocaleString()} · ${data.plan_type} · ${data.member_name}`,
        });
      }),
      subscribe("ANOMALY_DETECTED", (data) => {
        setAnomalies((prev) => [data, ...prev]);
        addToast({
          type: data.severity,
          title: `${data.severity.toUpperCase()} · ${data.gym_name}`,
          message: data.message,
          duration: data.severity === "critical" ? 8000 : 5000,
        });
      }),
      subscribe("ANOMALY_RESOLVED", (data) => {
        setAnomalies((prev) => prev.filter((a) => a.id !== data.anomaly_id));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [subscribe, addToast]);

  const totalOccupancy = gyms.reduce(
    (s, g) => s + (g.current_occupancy || 0),
    0,
  );
  const totalCapacity = gyms.reduce((s, g) => s + (g.capacity || 0), 0);
  const totalRevenue = gyms.reduce(
    (s, g) => s + parseFloat(g.today_revenue || 0),
    0,
  );
  const criticalCount = anomalies.filter(
    (a) => a.severity === "critical",
  ).length;

  if (loading) return <LoadingState />;

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-white tracking-wider">
            DASHBOARD
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time gym network overview
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-slate-600 uppercase tracking-widest">
            Network
          </div>
          <div className="font-display text-2xl text-white">
            {gyms.length} GYMS
          </div>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Live Occupancy"
          value={totalOccupancy.toLocaleString()}
          sub={`of ${totalCapacity.toLocaleString()} capacity`}
          accent="orange"
          icon="🏋️"
        />
        <StatCard
          label="Today's Revenue"
          value={`₹${(totalRevenue / 1000).toFixed(1)}K`}
          sub="across all gyms"
          accent="green"
          icon="💰"
        />
        <StatCard
          label="Active Anomalies"
          value={anomalies.length}
          sub={criticalCount > 0 ? `${criticalCount} critical` : "all clear"}
          accent={criticalCount > 0 ? "red" : "green"}
          icon="⚠️"
          flash={criticalCount > 0}
        />
        <StatCard
          label="Avg Occupancy"
          value={
            totalCapacity > 0
              ? `${((totalOccupancy / totalCapacity) * 100).toFixed(1)}%`
              : "—"
          }
          sub="network average"
          accent="blue"
          icon="📊"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Gym Grid */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-white">All Gyms</h2>
            <Link
              to="/gyms"
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gyms.map((gym) => (
              <GymCard key={gym.id} gym={gym} flashed={!!flashedGyms[gym.id]} />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Active Anomalies */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold text-white">
                Active Anomalies
              </h2>
              <Link
                to="/anomalies"
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {anomalies.length === 0 ? (
                <div className="glass rounded-xl p-6 text-center border border-white/5">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-slate-400 text-sm">
                    No active anomalies
                  </div>
                </div>
              ) : (
                anomalies
                  .slice(0, 5)
                  .map((a) => <AnomalyChip key={a.id} anomaly={a} />)
              )}
            </div>
          </div>

          {/* Revenue Leaderboard */}
          <div>
            <h2 className="font-heading font-semibold text-white mb-3">
              Revenue Leaderboard
            </h2>
            <div className="glass rounded-xl border border-white/5 overflow-hidden">
              {crossGym.slice(0, 5).map((gym, i) => (
                <div
                  key={gym.gym_id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0"
                >
                  <span
                    className={clsx(
                      "font-display text-lg w-6 text-center",
                      i === 0
                        ? "text-yellow-400"
                        : i === 1
                          ? "text-slate-300"
                          : i === 2
                            ? "text-amber-600"
                            : "text-slate-600",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {gym.gym_name}
                    </div>
                    <div className="text-xs text-slate-500">{gym.city}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-medium text-green-400">
                      ₹{(parseFloat(gym.total_revenue) / 1000).toFixed(1)}K
                    </div>
                    <div className="text-xs text-slate-600">30d</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Event Feed */}
          <div>
            <h2 className="font-heading font-semibold text-white mb-3">
              Live Feed
            </h2>
            <div className="glass rounded-xl border border-white/5 overflow-hidden max-h-48 overflow-y-auto">
              {events
                .filter((e) =>
                  ["CHECKIN_EVENT", "CHECKOUT_EVENT", "PAYMENT_EVENT"].includes(
                    e.type,
                  ),
                )
                .slice(0, 20)
                .map((e) => (
                  <div
                    key={e._id}
                    className="flex items-center gap-2 px-3 py-2 border-b border-white/5 last:border-0 animate-fade-in"
                  >
                    <span className="text-xs flex-shrink-0">
                      {e.type === "CHECKIN_EVENT"
                        ? "↗️"
                        : e.type === "CHECKOUT_EVENT"
                          ? "↙️"
                          : "💳"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-300 truncate">
                        {e.member_name}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-600 flex-shrink-0">
                      {e.type === "PAYMENT_EVENT"
                        ? `₹${e.amount?.toLocaleString()}`
                        : `${e.current_occupancy} in`}
                    </div>
                  </div>
                ))}
              {events.length === 0 && (
                <div className="px-4 py-6 text-center text-slate-600 text-xs">
                  Waiting for events...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GymCard({ gym, flashed }) {
  const pct = parseFloat(gym.occupancy_pct) || 0;
  const statusColor =
    gym.status === "active" ? "text-green-400" : "text-slate-500";

  return (
    <Link to={`/gyms/${gym.id}`}>
      <div
        className={clsx(
          "glass rounded-xl p-4 border transition-all duration-300 hover:border-orange-500/30 cursor-pointer group",
          flashed ? "border-orange-500/50 glow-orange" : "border-white/5",
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-semibold text-white text-sm group-hover:text-orange-300 transition-colors">
              {gym.name}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{gym.city}</div>
          </div>
          <span className={clsx("text-xs font-mono uppercase", statusColor)}>
            {gym.status}
          </span>
        </div>
        <CapacityBar
          pct={pct}
          current={gym.current_occupancy}
          capacity={gym.capacity}
        />
        <div className="flex justify-between mt-3">
          <div>
            <div className="text-xs text-slate-600">Today</div>
            <div className="text-sm font-mono text-green-400">
              ₹{(parseFloat(gym.today_revenue || 0) / 1000).toFixed(1)}K
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-600">Hours</div>
            <div className="text-xs font-mono text-slate-400">
              {gym.opens_at?.slice(0, 5)} – {gym.closes_at?.slice(0, 5)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AnomalyChip({ anomaly }) {
  const isCritical = anomaly.severity === "critical";
  return (
    <div
      className={clsx(
        "glass rounded-lg px-3 py-2.5 border text-xs",
        isCritical
          ? "border-red-500/30 bg-red-950/20"
          : "border-amber-500/30 bg-amber-950/20",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span>{isCritical ? "🚨" : "⚠️"}</span>
        <span
          className={clsx(
            "font-bold uppercase font-mono",
            isCritical ? "text-red-400" : "text-amber-400",
          )}
        >
          {anomaly.severity}
        </span>
        <span className="text-slate-600 ml-auto">
          {anomaly.detected_at &&
            formatDistanceToNow(new Date(anomaly.detected_at), {
              addSuffix: true,
            })}
        </span>
      </div>
      <div className="text-slate-300 leading-relaxed">
        {anomaly.message || anomaly.gym_name}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-36 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
