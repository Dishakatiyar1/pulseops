import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import { useWs } from "../context/WsContext";
import CapacityBar from "../components/CapacityBar";
import clsx from "clsx";

export default function Gyms() {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filter, setFilter] = useState("all");
  const { subscribe } = useWs();

  useEffect(() => {
    api
      .getGyms()
      .then(setGyms)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const unsubs = [
      subscribe("CHECKIN_EVENT", (d) =>
        setGyms((prev) =>
          prev.map((g) =>
            g.id === d.gym_id
              ? {
                  ...g,
                  current_occupancy: d.current_occupancy,
                  occupancy_pct: d.capacity_pct,
                }
              : g,
          ),
        ),
      ),
      subscribe("CHECKOUT_EVENT", (d) =>
        setGyms((prev) =>
          prev.map((g) =>
            g.id === d.gym_id
              ? {
                  ...g,
                  current_occupancy: d.current_occupancy,
                  occupancy_pct: d.capacity_pct,
                }
              : g,
          ),
        ),
      ),
      subscribe("PAYMENT_EVENT", (d) =>
        setGyms((prev) =>
          prev.map((g) =>
            g.id === d.gym_id ? { ...g, today_revenue: d.today_total } : g,
          ),
        ),
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [subscribe]);

  const filtered = gyms
    .filter((g) => {
      const matchSearch =
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.city.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ||
        g.status === filter ||
        (filter === "high" && parseFloat(g.occupancy_pct) > 70) ||
        (filter === "critical" && parseFloat(g.occupancy_pct) > 90);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "occupancy")
        return parseFloat(b.occupancy_pct) - parseFloat(a.occupancy_pct);
      if (sortBy === "revenue")
        return (
          parseFloat(b.today_revenue || 0) - parseFloat(a.today_revenue || 0)
        );
      return 0;
    });

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-white tracking-wider">
            GYMS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {gyms.length} locations · live data
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search gyms or cities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 glass border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-orange-500/50 transition-colors"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="glass border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-orange-500/50 bg-transparent"
        >
          <option value="all" className="bg-slate-900">
            All Status
          </option>
          <option value="active" className="bg-slate-900">
            Active
          </option>
          <option value="high" className="bg-slate-900">
            High Occupancy (&gt;70%)
          </option>
          <option value="critical" className="bg-slate-900">
            Critical (&gt;90%)
          </option>
          <option value="maintenance" className="bg-slate-900">
            Maintenance
          </option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="glass border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-orange-500/50 bg-transparent"
        >
          <option value="name" className="bg-slate-900">
            Sort: Name
          </option>
          <option value="occupancy" className="bg-slate-900">
            Sort: Occupancy
          </option>
          <option value="revenue" className="bg-slate-900">
            Sort: Revenue
          </option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((gym) => (
            <GymDetailCard key={gym.id} gym={gym} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-500">
              No gyms match your filters
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GymDetailCard({ gym }) {
  const pct = parseFloat(gym.occupancy_pct) || 0;
  const isCritical = pct > 90;
  const isHigh = pct > 70;

  return (
    <Link to={`/gyms/${gym.id}`}>
      <div
        className={clsx(
          "glass rounded-xl p-5 border hover:border-orange-500/30 transition-all duration-300 cursor-pointer group h-full",
          isCritical ? "border-red-500/20" : "border-white/5",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-semibold text-white group-hover:text-orange-300 transition-colors">
              {gym.name}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>📍</span> {gym.city}
            </div>
          </div>
          <div
            className={clsx(
              "text-xs font-mono uppercase px-2 py-1 rounded-md",
              gym.status === "active"
                ? "bg-green-500/10 text-green-400"
                : gym.status === "maintenance"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-slate-500/10 text-slate-500",
            )}
          >
            {gym.status}
          </div>
        </div>

        {/* Occupancy */}
        <div className="mb-4">
          <CapacityBar
            pct={pct}
            current={gym.current_occupancy}
            capacity={gym.capacity}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="glass rounded-lg p-2 border border-white/5">
            <div className="text-xs text-slate-600 mb-0.5">Revenue</div>
            <div className="text-sm font-mono text-green-400">
              ₹{(parseFloat(gym.today_revenue || 0) / 1000).toFixed(1)}K
            </div>
          </div>
          <div className="glass rounded-lg p-2 border border-white/5">
            <div className="text-xs text-slate-600 mb-0.5">Capacity</div>
            <div className="text-sm font-mono text-slate-300">
              {gym.capacity}
            </div>
          </div>
          <div className="glass rounded-lg p-2 border border-white/5">
            <div className="text-xs text-slate-600 mb-0.5">Hours</div>
            <div className="text-xs font-mono text-slate-400">
              {gym.opens_at?.slice(0, 5)}–{gym.closes_at?.slice(0, 5)}
            </div>
          </div>
        </div>

        {isCritical && (
          <div className="mt-3 text-xs text-red-400 font-mono flex items-center gap-1.5">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
            CAPACITY CRITICAL
          </div>
        )}
      </div>
    </Link>
  );
}
