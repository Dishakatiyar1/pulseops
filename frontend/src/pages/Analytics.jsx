import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import clsx from 'clsx';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#84cc16'];

export default function Analytics() {
  const [crossGym, setCrossGym] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCrossGymRevenue().then(d => {
      setCrossGym(d);
      setLoading(false);
    });
  }, []);

  const chartData = crossGym.map((g, i) => ({
    name: g.gym_name.split(' ').slice(0, 2).join(' '),
    revenue: parseFloat(g.total_revenue),
    rank: parseInt(g.rank),
    color: COLORS[i % COLORS.length],
    fullName: g.gym_name,
    city: g.city,
  }));

  const totalRevenue = crossGym.reduce((s, g) => s + parseFloat(g.total_revenue), 0);
  const avgRevenue = crossGym.length ? totalRevenue / crossGym.length : 0;
  const topGym = crossGym[0];

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white tracking-wider">ANALYTICS</h1>
        <p className="text-slate-500 text-sm mt-1">Cross-gym performance · last 30 days</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4 border border-white/5">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Network Revenue (30d)</div>
          <div className="font-display text-3xl text-orange-400">₹{(totalRevenue / 100000).toFixed(2)}L</div>
          <div className="text-xs text-slate-600 mt-1">across {crossGym.length} gyms</div>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Average Revenue</div>
          <div className="font-display text-3xl text-blue-400">₹{(avgRevenue / 1000).toFixed(1)}K</div>
          <div className="text-xs text-slate-600 mt-1">per gym</div>
        </div>
        <div className="glass rounded-xl p-4 border border-white/5 col-span-2 lg:col-span-1">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Top Performer</div>
          <div className="font-semibold text-white text-sm">{topGym?.gym_name}</div>
          <div className="font-display text-2xl text-green-400">₹{topGym ? (parseFloat(topGym.total_revenue) / 1000).toFixed(1) : 0}K</div>
        </div>
      </div>

      {loading ? (
        <div className="h-80 bg-white/5 rounded-xl animate-pulse" />
      ) : (
        <>
          {/* Bar Chart */}
          <div className="glass rounded-xl border border-white/5 p-5">
            <h3 className="font-semibold text-white text-sm mb-6">Revenue by Gym (30 days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 10, bottom: 60 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0' }}
                  formatter={(v, _, p) => [`₹${v.toLocaleString()}`, p.payload.fullName]}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Leaderboard Table */}
          <div className="glass rounded-xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Full Leaderboard</h3>
              <span className="text-xs font-mono text-slate-600">30-day revenue</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-xs font-mono text-slate-500 uppercase tracking-widest w-12">Rank</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-slate-500 uppercase tracking-widest">Gym</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-slate-500 uppercase tracking-widest">City</th>
                  <th className="text-right px-5 py-3 text-xs font-mono text-slate-500 uppercase tracking-widest">Revenue</th>
                  <th className="text-right px-5 py-3 text-xs font-mono text-slate-500 uppercase tracking-widest">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {crossGym.map((gym, i) => {
                  const share = totalRevenue > 0 ? (parseFloat(gym.total_revenue) / totalRevenue) * 100 : 0;
                  return (
                    <tr key={gym.gym_id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3">
                        <span className={clsx(
                          'font-display text-xl',
                          i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'
                        )}>
                          {gym.rank}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-sm text-white">{gym.gym_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">{gym.city}</td>
                      <td className="px-5 py-3 text-right font-mono text-green-400 text-sm">
                        ₹{parseFloat(gym.total_revenue).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${share}%`, background: COLORS[i % COLORS.length] }} />
                          </div>
                          <span className="text-xs font-mono text-slate-500 w-10 text-right">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
