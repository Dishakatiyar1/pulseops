import React, { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";
import { useWs } from "../context/WsContext";
import { useToast } from "../context/ToastContext";
import { formatDistanceToNow, format } from "date-fns";
import clsx from "clsx";

const TYPE_LABELS = {
  zero_checkins: "Zero Check-ins",
  capacity_breach: "Capacity Breach",
  revenue_drop: "Revenue Drop",
};

const TYPE_ICONS = {
  zero_checkins: "👻",
  capacity_breach: "🔴",
  revenue_drop: "📉",
};

export default function Anomalies() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dismissing, setDismissing] = useState({});
  const { subscribe } = useWs();
  const { addToast } = useToast();

  const load = useCallback(async () => {
    const data = await api.getAnomalies();
    setAnomalies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubs = [
      subscribe("ANOMALY_DETECTED", (d) => {
        setAnomalies((prev) => {
          if (prev.find((a) => a.id === d.anomaly_id)) return prev;
          return [
            { ...d, id: d.anomaly_id, detected_at: new Date().toISOString() },
            ...prev,
          ];
        });
      }),
      subscribe("ANOMALY_RESOLVED", (d) => {
        setAnomalies((prev) => prev.filter((a) => a.id !== d.anomaly_id));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [subscribe]);

  const dismiss = async (id) => {
    setDismissing((prev) => ({ ...prev, [id]: true }));
    try {
      await api.dismissAnomaly(id);
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
      addToast({ type: "success", message: "Anomaly dismissed" });
    } catch (e) {
      addToast({ type: "warning", message: e.message });
    } finally {
      setDismissing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filtered = anomalies.filter((a) => {
    if (filter === "all") return true;
    if (filter === "critical" || filter === "warning")
      return a.severity === filter;
    return a.type === filter;
  });

  const critical = anomalies.filter((a) => a.severity === "critical").length;
  const warning = anomalies.filter((a) => a.severity === "warning").length;

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white tracking-wider">
          ANOMALIES
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Real-time anomaly detection & alerts
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4 border border-red-500/20 bg-red-950/10">
          <div className="text-xs font-mono text-red-400 uppercase tracking-widest mb-1">
            Critical
          </div>
          <div className="font-display text-3xl text-red-400">{critical}</div>
        </div>
        <div className="glass rounded-xl p-4 border border-amber-500/20 bg-amber-950/10">
          <div className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-1">
            Warning
          </div>
          <div className="font-display text-3xl text-amber-400">{warning}</div>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">
            Total Active
          </div>
          <div className="font-display text-3xl text-white">
            {anomalies.length}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "critical", label: "🚨 Critical" },
          { key: "warning", label: "⚠️ Warning" },
          { key: "capacity_breach", label: "🔴 Capacity" },
          { key: "zero_checkins", label: "👻 Zero Check-ins" },
          { key: "revenue_drop", label: "📉 Revenue Drop" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === key
                ? "bg-orange-500 text-white"
                : "glass border border-white/10 text-slate-400 hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Anomaly list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl border border-white/5 p-16 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-slate-300 font-semibold">All clear!</div>
          <div className="text-slate-600 text-sm mt-1">
            No active anomalies match your filter
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((anomaly) => (
            <AnomalyCard
              key={anomaly.id}
              anomaly={anomaly}
              onDismiss={() => dismiss(anomaly.id)}
              dismissing={dismissing[anomaly.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AnomalyCard({ anomaly, onDismiss, dismissing }) {
  const [insight, setInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const isCritical = anomaly.severity === "critical";

  const fetchInsight = async () => {
    setLoadingInsight(true);
    try {
      const data = await api.getAnomalyInsight(anomaly.id);
      setInsight(data.insight);
    } catch (e) {
      setInsight("Could not generate insight at this time.");
    } finally {
      setLoadingInsight(false);
    }
  };

  return (
    <div
      className={clsx(
        "glass rounded-xl border p-5 transition-all duration-300",
        isCritical
          ? "border-red-500/30 bg-red-950/10"
          : "border-amber-500/20 bg-amber-950/10",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0",
            isCritical ? "bg-red-500/10" : "bg-amber-500/10",
          )}
        >
          {TYPE_ICONS[anomaly.type] || "⚠️"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={clsx(
                "text-xs font-mono font-bold uppercase px-2 py-0.5 rounded",
                isCritical
                  ? "bg-red-500/20 text-red-400"
                  : "bg-amber-500/20 text-amber-400",
              )}
            >
              {anomaly.severity}
            </span>
            <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
              {TYPE_LABELS[anomaly.type] || anomaly.type}
            </span>
            {anomaly.gym_name && (
              <span className="text-xs text-slate-500">
                📍 {anomaly.gym_name}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-200 leading-relaxed">
            {anomaly.message}
          </p>

          <div className="text-xs text-slate-600 mt-2 font-mono">
            Detected{" "}
            {anomaly.detected_at &&
              formatDistanceToNow(new Date(anomaly.detected_at), {
                addSuffix: true,
              })}
            {anomaly.detected_at &&
              ` · ${format(new Date(anomaly.detected_at), "MMM d, HH:mm")}`}
          </div>

          {/* AI Insight */}
          {insight && (
            <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-xs font-mono text-blue-400 mb-1.5">
                🤖 AI INSIGHT
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {insight}
              </p>
            </div>
          )}

          {/* AI Button */}
          {!insight && (
            <button
              onClick={fetchInsight}
              disabled={loadingInsight}
              className="mt-3 text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {loadingInsight
                ? "⏳ Generating insight..."
                : "🤖 Get AI Insight"}
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {!isCritical && (
            <button
              onClick={onDismiss}
              disabled={dismissing}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                dismissing
                  ? "border-white/5 text-slate-600 cursor-not-allowed"
                  : "border-white/10 text-slate-400 hover:border-orange-500/30 hover:text-orange-400",
              )}
            >
              {dismissing ? "Dismissing..." : "Dismiss"}
            </button>
          )}
          {isCritical && (
            <div className="text-xs font-mono text-red-600 text-right">
              Cannot
              <br />
              dismiss
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
