const { Pool } = require("pg");

function getPoolConfig() {
  const url =
    process.env.DATABASE_URL ||
    "postgres://pulseops:pulseops_secret@db:5432/pulseops";

  try {
    const parsed = new URL(url);
    return {
      user: decodeURIComponent(parsed.username),
      password:
        parsed.password != null ? decodeURIComponent(parsed.password) : "",
      host: parsed.hostname,
      port: parseInt(parsed.port || "5432", 10),
      database: parsed.pathname?.slice(1) || "pulseops",
      max: 10,
      idleTimeoutMillis: 30000,
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    return {
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30000,
    };
  }
}

const pool = new Pool(getPoolConfig());

module.exports = pool;
