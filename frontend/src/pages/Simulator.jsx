import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { useWs } from '../context/WsContext';
import { useToast } from '../context/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export default function Simulator() {
  const [status, setStatus] = useState('stopped'); // stopped | running
  const [speed, setSpeed] = useState(1);
  const [eventLog, setEventLog] = useState([]);
  const [stats, setStats] = useState({ checkins: 0, checkouts: 0, payments: 0, anomalies: 0 });
  const { subscribe, events } = useWs();
  const { addToast } = useToast();
  const logRef = useRef(null);

  // Collect events
  useEffect(() => {
    const unsubs = [
      subscribe('CHECKIN_EVENT', d => {
        setEventLog(prev => [{ ...d, _ts: new Date() }, ...prev].slice(0, 200));
        setStats(prev => ({ ...prev, checkins: prev.checkins + 1 }));
      }),
      subscribe('CHECKOUT_EVENT', d => {
        setEventLog(prev => [{ ...d, _ts: new Date() }, ...prev].slice(0, 200));
        setStats(prev => ({ ...prev, checkouts: prev.checkouts + 1 }));
      }),
      subscribe('PAYMENT_EVENT', d => {
        setEventLog(prev => [{ ...d, _ts: new Date() }, ...prev].slice(0, 200));
        setStats(prev => ({ ...prev, payments: prev.payments + 1 }));
      }),
      subscribe('ANOMALY_DETECTED', d => {
        setEventLog(prev => [{ ...d, _ts: new Date() }, ...prev].slice(0, 200));
        setStats(prev => ({ ...prev, anomalies: prev.anomalies + 1 }));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [subscribe]);

  const start = async () => {
    try {
      await api.startSimulator(speed);
      setStatus('running');
      addToast({ type: 'success', message: `Simulator started at ${speed}x speed` });
    } catch (e) {
      addToast({ type: 'warning', message: e.message });
    }
  };

  const stop = async () => {
    try {
      await api.stopSimulator();
      setStatus('stopped');
      addToast({ type: 'info', message: 'Simulator paused' });
    } catch (e) {
      addToast({ type: 'warning', message: e.message });
    }
  };

  const reset = async () => {
    try {
      await api.resetSimulator();
      setStatus('stopped');
      setStats({ checkins: 0, checkouts: 0, payments: 0, anomalies: 0 });
      setEventLog([]);
      addToast({ type: 'info', message: 'Simulator reset — all open sessions closed' });
    } catch (e) {
      addToast({ type: 'warning', message: e.message });
    }
  };

  const eventColor = (type) => {
    if (type === 'CHECKIN_EVENT') return 'text-green-400';
    if (type === 'CHECKOUT_EVENT') return 'text-orange-400';
    if (type === 'PAYMENT_EVENT') return 'text-blue-400';
    if (type === 'ANOMALY_DETECTED') return 'text-red-400';
    return 'text-slate-400';
  };

  const eventIcon = (type) => {
    if (type === 'CHECKIN_EVENT') return '↗';
    if (type === 'CHECKOUT_EVENT') return '↙';
    if (type === 'PAYMENT_EVENT') return '💳';
    if (type === 'ANOMALY_DETECTED') return '🚨';
    return '·';
  };

  const eventLabel = (e) => {
    if (e.type === 'CHECKIN_EVENT') return `${e.member_name} checked in · ${e.current_occupancy} now inside`;
    if (e.type === 'CHECKOUT_EVENT') return `${e.member_name} checked out · ${e.current_occupancy} now inside`;
    if (e.type === 'PAYMENT_EVENT') return `${e.member_name} paid ₹${e.amount?.toLocaleString()} (${e.plan_type})`;
    if (e.type === 'ANOMALY_DETECTED') return `ANOMALY: ${e.message || e.anomaly_type}`;
    return JSON.stringify(e);
  };

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white tracking-wider">SIMULATOR</h1>
        <p className="text-slate-500 text-sm mt-1">Control the live data simulation engine</p>
      </div>

      {/* Control panel */}
      <div className="glass rounded-xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={clsx(
            'w-3 h-3 rounded-full flex-shrink-0',
            status === 'running' ? 'bg-green-400 live-dot' : 'bg-slate-600'
          )} />
          <span className="font-mono text-sm font-bold text-white">
            {status === 'running' ? `RUNNING AT ${speed}x` : 'STOPPED'}
          </span>
        </div>

        {/* Speed selector */}
        <div className="mb-6">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Simulation Speed</div>
          <div className="flex gap-3">
            {[1, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                disabled={status === 'running'}
                className={clsx(
                  'flex-1 py-3 rounded-xl text-sm font-bold font-mono transition-all border',
                  speed === s
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20',
                  status === 'running' && 'opacity-50 cursor-not-allowed'
                )}
              >
                {s}×
                <div className="text-xs font-normal mt-0.5 text-slate-600">
                  {s === 1 ? '2s/tick' : s === 5 ? '400ms/tick' : '200ms/tick'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {status === 'stopped' ? (
            <button
              onClick={start}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all glow-orange"
              style={{ background: 'linear-gradient(135deg, #f97316, #c2410c)', color: 'white' }}
            >
              ▶ START SIMULATION
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex-1 py-3 rounded-xl font-bold text-sm glass border border-white/10 text-white hover:border-orange-500/30 transition-all"
            >
              ⏸ PAUSE
            </button>
          )}
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl font-bold text-sm glass border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
          >
            ↺ RESET
          </button>
        </div>

        <p className="text-xs text-slate-600 mt-4">
          Reset closes all open check-in sessions. Use to clear stale data before restarting.
        </p>
      </div>

      {/* Session stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Check-ins', value: stats.checkins, color: 'text-green-400', icon: '↗' },
          { label: 'Check-outs', value: stats.checkouts, color: 'text-orange-400', icon: '↙' },
          { label: 'Payments', value: stats.payments, color: 'text-blue-400', icon: '💳' },
          { label: 'Anomalies', value: stats.anomalies, color: 'text-red-400', icon: '🚨' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="glass rounded-xl p-4 border border-white/5">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
              {icon} {label}
            </div>
            <div className={clsx('font-display text-3xl', color)}>{value.toLocaleString()}</div>
            <div className="text-xs text-slate-600 mt-0.5">this session</div>
          </div>
        ))}
      </div>

      {/* Event log */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Live Event Log</h3>
          <div className="flex items-center gap-2">
            {status === 'running' && <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />}
            <span className="text-xs font-mono text-slate-600">{eventLog.length} events</span>
          </div>
        </div>
        <div ref={logRef} className="overflow-y-auto font-mono text-xs" style={{ maxHeight: 440 }}>
          {eventLog.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-600">
              Start the simulator to see live events
            </div>
          ) : (
            eventLog.map((e, i) => (
              <div
                key={i}
                className={clsx(
                  'flex items-start gap-3 px-5 py-2 border-b border-white/5 hover:bg-white/2 transition-colors',
                  i === 0 && 'animate-fade-in'
                )}
              >
                <span className={clsx('flex-shrink-0 w-4 text-center', eventColor(e.type))}>
                  {eventIcon(e.type)}
                </span>
                <span className="text-slate-600 flex-shrink-0 w-16">
                  {e._ts?.toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={clsx('flex-1', eventColor(e.type))}>{eventLabel(e)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
