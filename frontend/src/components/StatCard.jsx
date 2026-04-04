import React from 'react';
import clsx from 'clsx';

export default function StatCard({ label, value, sub, accent, icon, trend, flash }) {
  const accentColors = {
    orange: { border: 'border-orange-500/30', text: 'text-orange-400', bg: 'bg-orange-500/10' },
    red: { border: 'border-red-500/30', text: 'text-red-400', bg: 'bg-red-500/10' },
    green: { border: 'border-green-500/30', text: 'text-green-400', bg: 'bg-green-500/10' },
    blue: { border: 'border-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-500/10' },
    purple: { border: 'border-purple-500/30', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  };

  const c = accentColors[accent] || accentColors.orange;

  return (
    <div className={clsx(
      'glass rounded-xl p-5 border transition-all duration-300',
      c.border,
      flash && 'animate-pulse'
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{label}</span>
        {icon && (
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', c.bg)}>
            <span className={clsx('text-sm', c.text)}>{icon}</span>
          </div>
        )}
      </div>
      <div className={clsx('font-display text-3xl leading-none mb-1', c.text)}>
        {value ?? '—'}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1.5">{sub}</div>}
      {trend !== undefined && (
        <div className={clsx('text-xs mt-2 font-medium', trend >= 0 ? 'text-green-400' : 'text-red-400')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}
