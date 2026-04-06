# PulseOps

A real-time operations dashboard for multi-location gym chains. Built to give operations managers a live view of every location — occupancy, revenue, and anomalies — without making a single phone call.

**Live Demo:** [pulseops-chi.vercel.app](https://pulseops-chi.vercel.app)  
**Backend:** [pulseops-backend-mhx7.onrender.com](https://pulseops-backend-mhx7.onrender.com/health)

---

## What It Does

- **Live occupancy** — members currently inside each gym, updating via WebSocket the moment someone checks in or out
- **Revenue tracking** — today's revenue per location, ticking live as payments arrive
- **Anomaly detection** — background engine runs every 30s, flags capacity breaches, revenue drops, and inactive gyms. Auto-resolves when conditions clear
- **AI insights** — click any anomaly for a GPT-4o-mini generated explanation and suggested action
- **Analytics** — peak hours heatmap, churn risk members, revenue by plan type, cross-location leaderboard
- **Simulator** — generates realistic check-in patterns at 1x/5x/10x speed for live demos

---

## Quick Start

```bash
docker compose up
```

DB seeds automatically — 10 locations, 5,000 members, 270,000+ historical records. Takes about a minute on first launch.

- Frontend → http://localhost:5173
- Backend → http://localhost:5000

---

## Tech Stack

- **Frontend** — React 18, TailwindCSS, Recharts, React Router
- **Backend** — Node.js, Express, WebSocket (ws), JWT authentication
- **Database** — PostgreSQL 15 with BRIN/partial indexes + materialized view
- **AI** — OpenAI GPT-4o-mini
- **Testing** — Jest (unit + integration), 21 tests
- **Infra** — Docker Compose (local), Render + Neon + Vercel (production)

---

## Architecture Decisions

**PostgreSQL over MongoDB** — data is deeply relational. Members belong to gyms, checkins belong to members, payments belong to both. A single query joins all four tables. MongoDB would need multiple roundtrips for the same analytics query.

**WebSocket over polling** — polling every second with 10 connected clients = 600 HTTP requests/minute, most returning no new data. WebSocket maintains one persistent connection and pushes only when an event actually occurs.

**BRIN index on checkins** — the checkins table is append-only and physically time-ordered on disk. BRIN stores min/max values per disk block — 10x smaller than a B-Tree and eliminates sequential scans for time-range queries on large tables.

**Partial indexes** — live occupancy only queries rows where `checked_out IS NULL` — roughly 200 rows out of 270K at any given moment. A partial index covering only those rows is tiny, fast, and purpose-built. Same approach for churn risk (active members only) and anomalies (unresolved only).

**Materialized view for heatmap** — the peak hours heatmap needs a GROUP BY across 7 days of checkins. Running this live would take ~100ms. Pre-computing it in a materialized view drops query time to under 0.3ms.

---

## Query Performance

Benchmarked on seeded dataset: 270K+ checkin records, 5,000 members, 10 gyms.

| Query                        | Index                                   | Time   |
| ---------------------------- | --------------------------------------- | ------ |
| Live occupancy — single gym  | `idx_checkins_live_occupancy` (partial) | <0.5ms |
| Today's revenue — single gym | `idx_payments_gym_date` (composite)     | <0.8ms |
| Churn risk members           | `idx_members_churn_risk` (partial)      | <1ms   |
| Peak hour heatmap            | Materialized view                       | <0.3ms |
| Cross-location revenue       | `idx_payments_date`                     | <2ms   |
| Active anomalies             | `idx_anomalies_active` (partial)        | <0.3ms |

---

## Testing

```bash
cd backend && npm test
```

21 tests across two suites:

**Unit tests** — anomaly detection logic tested in isolation. Covers all three anomaly types (capacity breach, zero checkins, revenue drop) and their auto-resolve conditions.

**Integration tests** — API endpoints tested with Supertest. Covers auth flows, gym routes, anomaly dismiss rules (403 on critical), and simulator controls.

Coverage report generated at `/backend/coverage`.

---

## Tools Used

- **Cursor** — used heavily for in-editor completions, refactoring, and navigating the codebase
- **Claude** — used for researching PostgreSQL index strategies and debugging Docker networking issues
- **ChatGPT** — occasional reference for Recharts API and date-fns syntax

---

## Known Limitations

- Tenant isolation not yet implemented — all users see all gym data. The `organization` field exists on the users table and the architecture supports it
- Resolved anomalies are removed from the UI immediately (stored correctly in DB with `resolved_at`)
- Free tier Render backend spins down after inactivity — first request after idle takes ~30s
- Mobile layout not supported (1280px minimum width)
