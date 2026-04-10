import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useWs } from "../context/WsContext";
import clsx from "clsx";

const navItems = [
  { to: "/", label: "Dashboard", icon: GridIcon },
  { to: "/gyms", label: "Gyms", icon: DumbbellIcon },
  { to: "/anomalies", label: "Anomalies", icon: AlertIcon },
  { to: "/analytics", label: "Analytics", icon: ChartIcon },
  { to: "/simulator", label: "Simulator", icon: PlayIcon },
];

export default function Sidebar({ anomalyCount = 0 }) {
  const { connected } = useWs();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-16 lg:w-56 flex flex-col z-40"
      style={{
        background: "rgba(10,10,15,0.95)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="px-3 lg:px-5 py-5 flex items-center gap-3 border-b border-white/5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #f97316, #c2410c)" }}
        >
          <span className="text-white font-display text-sm">W</span>
        </div>
        <div className="hidden lg:block">
          <div className="font-display text-white text-lg leading-none tracking-wider">
            Pulse
          </div>
          <div className="text-xs text-slate-500 font-mono tracking-widest">
            PULSEOPS
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-orange-500/10 text-orange-400"
                  : "text-slate-500 hover:text-slate-200 hover:bg-white/5",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r"
                    style={{ background: "#f97316" }}
                  />
                )}
                <Icon
                  className={clsx(
                    "w-4 h-4 flex-shrink-0",
                    isActive
                      ? "text-orange-400"
                      : "text-slate-500 group-hover:text-slate-300",
                  )}
                />
                <span className="hidden lg:block text-sm font-medium">
                  {label}
                </span>
                {label === "Anomalies" && anomalyCount > 0 && (
                  <span className="hidden lg:flex ml-auto min-w-[1.2rem] h-5 items-center justify-center rounded-full text-xs font-bold bg-red-500 text-white px-1">
                    {anomalyCount > 9 ? "9+" : anomalyCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 lg:px-5 pb-2 border-t border-white/5 pt-3">
        <div className="hidden lg:flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #f97316, #c2410c)" }}
          >
            {JSON.parse(
              localStorage.getItem("user") || "{}",
            )?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-300 truncate">
              {JSON.parse(localStorage.getItem("user") || "{}")?.name || "User"}
            </div>
            <div className="text-xs text-slate-600 truncate">
              {JSON.parse(localStorage.getItem("user") || "{}")?.role ||
                "manager"}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left text-xs font-mono text-slate-600 hover:text-red-400 transition-colors py-1"
        >
          → LOGOUT
        </button>
      </div>

      {/* WS Status */}
      <div className="px-3 lg:px-5 py-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "w-2 h-2 rounded-full flex-shrink-0",
              connected ? "bg-green-400 live-dot" : "bg-red-500",
            )}
          />
          <span className="hidden lg:block text-xs font-mono text-slate-500">
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>
    </aside>
  );
}

function GridIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function DumbbellIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function AlertIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function ChartIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function PlayIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
      />
    </svg>
  );
}
