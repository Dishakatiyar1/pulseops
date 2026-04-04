import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../utils/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(form.email, form.password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0a0a0f" }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="w-full max-w-md px-6 page-enter">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #f97316, #c2410c)",
              }}
            >
              <span className="font-display text-white text-lg">P</span>
            </div>
            <span className="font-display text-3xl text-white tracking-wider">
              PULSEOPS
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            Real-time gym operations platform
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl border border-white/8 p-8">
          <h2 className="font-heading font-semibold text-white text-xl mb-6">
            Sign in to your account
          </h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                required
                className="w-full glass border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full glass border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all mt-2"
              style={{
                background: loading
                  ? "#7c2d12"
                  : "linear-gradient(135deg, #f97316, #c2410c)",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-6">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
