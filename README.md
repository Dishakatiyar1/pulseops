# PulseOps

Real-time multi-location operations platform. Monitor live occupancy,
revenue, and anomalies across all gym locations from a single dashboard.

## Quick Start

```bash
docker compose up
```

- Frontend → http://localhost:5173
- Backend → http://localhost:5000
- DB auto-seeds on first launch (~270K records, takes ~1 min)

## What's Built

**Live Dashboard**

- Live occupancy + revenue per location via WebSocket
- Real-time event feed (check-ins, check-outs, payments)
- Network-wide summary bar across all locations

**Anomaly Detection**

- Auto-detects capacity breach, zero check-ins, revenue drops
- Auto-resolves when conditions clear
- Manual dismiss for warnings (critical alerts cannot be dismissed)
- Toast notifications for every anomaly event

**Analytics**

- Peak hours heatmap (7-day, materialized view)
- Revenue breakdown by plan type (monthly/quarterly/annual)
- New vs renewal member ratio (donut chart)
- Cross-location revenue leaderboard (30-day ranking)
- Churn risk panel - members inactive 45+ days

**Simulator**

- Generates realistic check-in/checkout/payment events
- 1x / 5x / 10x speed control
- Reset to baseline

## Tech Stack

| Layer    | Technology                       |
| -------- | -------------------------------- |
| Frontend | React 18, TailwindCSS, Recharts  |
| Backend  | Node.js, Express, WebSocket (ws) |
| Database | PostgreSQL 15                    |
| Infra    | Docker Compose                   |

## Architecture Decisions

**Why PostgreSQL over MongoDB?**
Data is relational - members belong to locations, checkins belong to members.
PostgreSQL allows complex analytics queries in a single roundtrip.

**Why WebSocket over polling?**
Polling at 1s intervals with multiple clients = hundreds of requests/minute.
WebSocket keeps one persistent connection and pushes only on events.

**Why BRIN index on checkins?**
Table is append-only and time-ordered. BRIN is 10x smaller than B-Tree
and eliminates sequential scans for time-range queries.

**Why partial indexes?**
Live occupancy only needs rows where checked_out IS NULL - tiny fraction
of 270K rows. Partial index is small, fast, and purpose-built.

**Why materialized view for heatmap?**
Pre-computes 7-day GROUP BY aggregation. Query drops from ~100ms to
under 0.3ms.

## Query Performance

| Query                  | Index Used                            | Time   |
| ---------------------- | ------------------------------------- | ------ |
| Live occupancy         | idx_checkins_live_occupancy (partial) | <0.5ms |
| Today's revenue        | idx_payments_gym_date (composite)     | <0.8ms |
| Churn risk members     | idx_members_churn_risk (partial)      | <1ms   |
| Peak hour heatmap      | Materialized view                     | <0.3ms |
| Cross-location revenue | idx_payments_date                     | <2ms   |
| Active anomalies       | idx_anomalies_active (partial)        | <0.3ms |

## API Reference

| Method | Endpoint                     | Description                                     |
| ------ | ---------------------------- | ----------------------------------------------- |
| GET    | `/api/gyms`                  | All locations with live occupancy + revenue     |
| GET    | `/api/gyms/:id/live`         | Single location live snapshot                   |
| GET    | `/api/gyms/:id/analytics`    | Heatmap, revenue, churn, ratios                 |
| GET    | `/api/anomalies`             | Active anomalies (filter by location, severity) |
| PATCH  | `/api/anomalies/:id/dismiss` | Dismiss warning - 403 if critical               |
| GET    | `/api/analytics/cross-gym`   | Revenue leaderboard, 30 days                    |
| POST   | `/api/simulator/start`       | Start simulator at speed 1x, 5x or 10x          |
| POST   | `/api/simulator/stop`        | Pause simulator                                 |
| POST   | `/api/simulator/reset`       | Reset all open sessions                         |

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

## Known Limitations

- Tests not yet implemented (Jest + Playwright)
- No authentication yet (JWT coming soon)
- Resolved anomalies removed from UI immediately
- Mobile layout not supported (1280px minimum)

## Roadmap

- [ ] JWT authentication + multi-tenant isolation
- [ ] AI-powered anomaly insights (OpenAI)
- [ ] Jest unit + integration tests
- [ ] Deploy on Railway + Vercel
- [ ] WhatsApp/SMS alerts for critical anomalies
