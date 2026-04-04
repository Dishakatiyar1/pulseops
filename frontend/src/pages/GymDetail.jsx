import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../utils/api";
import { useWs } from "../context/WsContext";
import CapacityBar from "../components/CapacityBar";
import StatCard from "../components/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatDistanceToNow, format } from "date-fns";
import clsx from "clsx";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 5); // 5am–9pm

const PLAN_COLORS = {
  monthly: "#f97316",
  quarterly: "#3b82f6",
  annual: "#22c55e",
};

export default function GymDetail() {
  const { id } = useParams();
  const [live, setLive] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const { subscribe } = useWs();

  const loadLive = useCallback(async () => {
    const data = await api.getGymLive(id);
    setLive(data);
    setLoading(false);
  }, [id]);

  const loadAnalytics = useCallback(async () => {
    const data = await api.getGymAnalytics(id, dateRange);
    setAnalytics(data);
  }, [id, dateRange]);

  useEffect(() => {
    loadLive();
  }, [loadLive]);
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Poll live data every 10s
  useEffect(() => {
    const t = setInterval(loadLive, 10000);
    return () => clearInterval(t);
  }, [loadLive]);

  useEffect(() => {
    const unsubs = [
      subscribe("CHECKIN_EVENT", (d) => {
        if (d.gym_id !== id) return;
        setLive((prev) =>
          prev
            ? {
                ...prev,
                current_occupancy: d.current_occupancy,
                occupancy_pct: d.capacity_pct,
                recent_events: [
                  {
                    type: "checkin",
                    member_name: d.member_name,
                    ts: d.timestamp,
                  },
                  ...(prev.recent_events || []),
                ].slice(0, 10),
              }
            : prev,
        );
      }),
      subscribe("CHECKOUT_EVENT", (d) => {
        if (d.gym_id !== id) return;
        setLive((prev) =>
          prev
            ? {
                ...prev,
                current_occupancy: d.current_occupancy,
                occupancy_pct: d.capacity_pct,
                recent_events: [
                  {
                    type: "checkout",
                    member_name: d.member_name,
                    ts: d.timestamp,
                  },
                  ...(prev.recent_events || []),
                ].slice(0, 10),
              }
            : prev,
        );
      }),
      subscribe("PAYMENT_EVENT", (d) => {
        if (d.gym_id !== id) return;
        setLive((prev) =>
          prev ? { ...prev, today_revenue: d.today_total } : prev,
        );
      }),
      subscribe("ANOMALY_DETECTED", (d) => {
        if (d.gym_id !== id) return;
        setLive((prev) =>
          prev
            ? {
                ...prev,
                active_anomalies: [...(prev.active_anomalies || []), d],
              }
            : prev,
        );
      }),
      subscribe("ANOMALY_RESOLVED", (d) => {
        if (d.gym_id !== id) return;
        setLive((prev) =>
          prev
            ? {
                ...prev,
                active_anomalies: (prev.active_anomalies || []).filter(
                  (a) => a.id !== d.anomaly_id,
                ),
              }
            : prev,
        );
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [subscribe, id]);

  if (loading) return <LoadingState />;
  if (!live)
    return (
      <div className="text-slate-500 text-center py-20">Gym not found</div>
    );

  const pct = live.occupancy_pct || 0;

  return (
    <div className="page-enter space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <Link
          to="/gyms"
          className="text-xs text-slate-600 hover:text-orange-400 transition-colors mb-2 inline-block"
        >
          ← All Gyms
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-4xl text-white tracking-wider">
              {live.name.toUpperCase()}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-slate-500 text-sm">📍 {live.city}</span>
              <span
                className={clsx(
                  "text-xs font-mono px-2 py-0.5 rounded",
                  live.status === "active"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-slate-500/10 text-slate-500",
                )}
              >
                {live.status}
              </span>
              <span className="text-xs text-slate-600 font-mono">
                {live.opens_at?.slice(0, 5)} – {live.closes_at?.slice(0, 5)}
              </span>
            </div>
          </div>
          {/* Live badge */}
          <div className="flex items-center gap-2 glass border border-green-500/20 rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />
            <span className="text-xs font-mono text-green-400">LIVE</span>
          </div>
        </div>
      </div>

      {/* Active anomalies banner */}
      {live.active_anomalies?.length > 0 && (
        <div className="space-y-2">
          {live.active_anomalies.map((a) => (
            <div
              key={a.id}
              className={clsx(
                "glass rounded-xl px-4 py-3 border flex items-center gap-3",
                a.severity === "critical"
                  ? "border-red-500/40 bg-red-950/20"
                  : "border-amber-500/40 bg-amber-950/20",
              )}
            >
              <span className="text-lg">
                {a.severity === "critical" ? "🚨" : "⚠️"}
              </span>
              <div>
                <span
                  className={clsx(
                    "text-xs font-mono font-bold uppercase mr-2",
                    a.severity === "critical"
                      ? "text-red-400"
                      : "text-amber-400",
                  )}
                >
                  {a.severity}
                </span>
                <span className="text-sm text-slate-300">{a.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Current Occupancy"
          value={live.current_occupancy}
          sub={`of ${live.capacity} capacity`}
          accent="orange"
          icon="🏋️"
        />
        <StatCard
          label="Occupancy %"
          value={`${pct.toFixed(1)}%`}
          sub={pct > 90 ? "CRITICAL" : pct > 70 ? "HIGH" : "NORMAL"}
          accent={pct > 90 ? "red" : pct > 70 ? "purple" : "green"}
          icon="📊"
        />
        <StatCard
          label="Today Revenue"
          value={`₹${(parseFloat(live.today_revenue || 0) / 1000).toFixed(2)}K`}
          accent="green"
          icon="💰"
        />
        <StatCard
          label="Anomalies"
          value={live.active_anomalies?.length || 0}
          accent={live.active_anomalies?.length > 0 ? "red" : "blue"}
          icon="⚠️"
        />
      </div>

      {/* Capacity Bar */}
      <div className="glass rounded-xl p-5 border border-white/5">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
          Live Capacity
        </h3>
        <CapacityBar
          pct={pct}
          current={live.current_occupancy}
          capacity={live.capacity}
          height="h-4"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass border border-white/5 rounded-xl p-1 w-fit">
        {["overview", "analytics", "heatmap", "churn"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t
                ? "bg-orange-500 text-white"
                : "text-slate-500 hover:text-white",
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab live={live} />}
      {tab === "analytics" && analytics && (
        <AnalyticsTab
          analytics={analytics}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      )}
      {tab === "heatmap" && analytics && (
        <HeatmapTab heatmap={analytics.heatmap} />
      )}
      {tab === "churn" && analytics && (
        <ChurnTab churn={analytics.churn_risk} />
      )}
    </div>
  );
}

function OverviewTab({ live }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Recent Events */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm">Recent Check-ins</h3>
        </div>
        <div className="divide-y divide-white/5">
          {live.recent_events?.length === 0 && (
            <div className="px-5 py-8 text-center text-slate-600 text-sm">
              No recent events
            </div>
          )}
          {live.recent_events?.map((e, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div
                className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0",
                  e.type === "checkin" ? "bg-green-500/10" : "bg-orange-500/10",
                )}
              >
                {e.type === "checkin" ? "↗" : "↙"}
              </div>
              <div className="flex-1">
                <div className="text-sm text-white font-medium">
                  {e.member_name}
                </div>
                <div className="text-xs text-slate-500">
                  {e.ts &&
                    formatDistanceToNow(new Date(e.ts), { addSuffix: true })}
                </div>
              </div>
              <span
                className={clsx(
                  "text-xs font-mono",
                  e.type === "checkin" ? "text-green-400" : "text-orange-400",
                )}
              >
                {e.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gym Info */}
      <div className="glass rounded-xl border border-white/5 p-5 space-y-4">
        <h3 className="font-semibold text-white text-sm">Gym Details</h3>
        <div className="space-y-3">
          {[
            { label: "Address", value: live.address || "Not specified" },
            { label: "Capacity", value: `${live.capacity} members` },
            {
              label: "Operating Hours",
              value: `${live.opens_at?.slice(0, 5)} – ${live.closes_at?.slice(0, 5)}`,
            },
            { label: "Status", value: live.status },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-xs text-slate-600 uppercase tracking-wide">
                {label}
              </span>
              <span className="text-sm text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ analytics, dateRange, setDateRange }) {
  const revenueData =
    analytics.revenue_by_plan?.map((r) => ({
      name: r.plan_type,
      total: parseFloat(r.total),
      count: parseInt(r.count),
    })) || [];

  const ratioData =
    analytics.member_ratio?.map((r) => ({
      name: r.member_type,
      value: parseInt(r.count),
    })) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {["7d", "30d", "90d"].map((d) => (
          <button
            key={d}
            onClick={() => setDateRange(d)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-mono transition-all",
              dateRange === d
                ? "bg-orange-500 text-white"
                : "glass border border-white/10 text-slate-400 hover:text-white",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Plan */}
        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="font-semibold text-white text-sm mb-4">
            Revenue by Plan
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={revenueData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  background: "#16161f",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  color: "#e2e8f0",
                }}
                formatter={(v) => [`₹${v.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {revenueData.map((entry, i) => (
                  <Cell key={i} fill={PLAN_COLORS[entry.name] || "#f97316"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Member Ratio */}
        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="font-semibold text-white text-sm mb-4">
            New vs Renewal Members
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={ratioData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                nameKey="name"
                paddingAngle={3}
              >
                <Cell fill="#f97316" />
                <Cell fill="#3b82f6" />
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#16161f",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  color: "#e2e8f0",
                }}
              />
              <Legend
                formatter={(v) => (
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function HeatmapTab({ heatmap }) {
  // Build lookup: day_of_week -> hour_of_day -> count
  const lookup = {};
  let maxCount = 1;
  heatmap?.forEach((cell) => {
    if (!lookup[cell.day_of_week]) lookup[cell.day_of_week] = {};
    lookup[cell.day_of_week][cell.hour_of_day] = cell.checkin_count;
    if (cell.checkin_count > maxCount) maxCount = cell.checkin_count;
  });

  const getColor = (count) => {
    if (!count) return "rgba(255,255,255,0.03)";
    const intensity = count / maxCount;
    if (intensity > 0.75) return `rgba(249, 115, 22, ${0.4 + intensity * 0.6})`;
    if (intensity > 0.4) return `rgba(251, 191, 36, ${0.3 + intensity * 0.5})`;
    return `rgba(34, 197, 94, ${0.2 + intensity * 0.4})`;
  };

  return (
    <div className="glass rounded-xl border border-white/5 p-5">
      <h3 className="font-semibold text-white text-sm mb-6">
        Peak Hours Heatmap (last 7 days)
      </h3>
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Hour labels */}
          <div className="flex mb-2 ml-10">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-xs font-mono text-slate-600"
              >
                {h}
              </div>
            ))}
          </div>
          {/* Rows */}
          {DAYS.map((day, di) => (
            <div key={di} className="flex items-center mb-1.5">
              <div className="w-10 text-xs font-mono text-slate-500 flex-shrink-0">
                {day}
              </div>
              {HOURS.map((h) => {
                const count = lookup[di]?.[h] || 0;
                return (
                  <div key={h} className="flex-1 mx-0.5">
                    <div
                      className="heatmap-cell rounded aspect-square relative group cursor-default"
                      style={{ background: getColor(count) }}
                      title={`${day} ${h}:00 – ${count} check-ins`}
                    >
                      {count > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-bold">
                            {count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 justify-end">
            <span className="text-xs text-slate-600">Low</span>
            {[
              "rgba(34,197,94,0.3)",
              "rgba(251,191,36,0.5)",
              "rgba(249,115,22,0.7)",
              "rgba(249,115,22,1)",
            ].map((c, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded"
                style={{ background: c }}
              />
            ))}
            <span className="text-xs text-slate-600">High</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChurnTab({ churn }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Churn Risk Members</h3>
        <span className="text-xs font-mono glass border border-red-500/20 text-red-400 px-2 py-1 rounded">
          {churn?.length || 0} at risk
        </span>
      </div>

      {!churn || churn.length === 0 ? (
        <div className="glass rounded-xl border border-white/5 p-12 text-center">
          <div className="text-3xl mb-3">✅</div>
          <div className="text-slate-400">No churn risk members detected</div>
          <div className="text-slate-600 text-xs mt-1">
            All active members checked in within 45 days
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-mono text-slate-500 uppercase tracking-widest">
                  Member
                </th>
                <th className="text-left px-5 py-3 text-xs font-mono text-slate-500 uppercase tracking-widest">
                  Last Check-in
                </th>
                <th className="text-left px-5 py-3 text-xs font-mono text-slate-500 uppercase tracking-widest">
                  Risk
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {churn.map((m) => (
                <tr key={m.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3 text-sm text-white">{m.name}</td>
                  <td className="px-5 py-3 text-xs font-mono text-slate-500">
                    {m.last_checkin_at
                      ? formatDistanceToNow(new Date(m.last_checkin_at), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={clsx(
                        "text-xs font-mono font-bold px-2 py-0.5 rounded",
                        m.risk_level === "CRITICAL"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400",
                      )}
                    >
                      {m.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-white/5 rounded animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
    </div>
  );
}
