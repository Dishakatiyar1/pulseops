import React from 'react';
import clsx from 'clsx';

export default function CapacityBar({ pct, current, capacity, showLabels = true, height = 'h-2' }) {
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
  const label = pct > 90 ? 'CRITICAL' : pct > 70 ? 'HIGH' : 'NORMAL';

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-mono text-slate-500">{current}/{capacity}</span>
          <span className="text-xs font-mono font-bold" style={{ color }}>
            {pct.toFixed(1)}% · {label}
          </span>
        </div>
      )}
      <div className={clsx('w-full rounded-full overflow-hidden', height)}
        style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        >
          {pct > 50 && <div className="shimmer absolute inset-0" />}
        </div>
      </div>
    </div>
  );
}
