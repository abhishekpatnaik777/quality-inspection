# Quality Inspection

Boilerplate full-stack app: **React (Vite)** + **Node.js (Express)** + **PostgreSQL**.

## Structure

```
quality-inspection/
├── client/          # React frontend (Vite)
├── server/          # Express API
├── scripts/         # DB setup helpers
└── package.json     # Root scripts
```

## Prerequisites

- Node.js 20+
- [Postgres.app](https://postgresapp.com/) (or any local PostgreSQL)

## Setup

```bash
# Install dependencies
npm run install:all

# Start Postgres.app, then create DB + apply schema
npm run db:up
```

`server/.env` (Postgres.app default — your macOS username, no password):

```
DATABASE_URL=postgresql://YOUR_MAC_USERNAME@127.0.0.1:5432/quality_inspection
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

## Develop

```bash
# API on :4000 and Vite on :5173 (proxied /api)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Pre-commit checks

A Husky **pre-commit** hook runs automatically before every commit:

1. **Format check** — `prettier --check`
2. **Lint** — `oxlint` (client + server)
3. **Unit tests** — Node test runner (server) + Vitest (client)
4. **Security audit** — `npm audit` (root, server, client; fails on high+)

Run the same suite manually:

```bash
npm run precommit
```

Individual commands:

```bash
npm run format:check
npm run lint
npm run test
npm run audit
```

## API

| Method   | Path             | Description                        |
| -------- | ---------------- | ---------------------------------- |
| `GET`    | `/api/health`    | Health + DB check                  |
| `GET`    | `/api/items`     | List items                         |
| `GET`    | `/api/items/:id` | Get one item                       |
| `POST`   | `/api/items`     | Create `{ name, status?, notes? }` |
| `PATCH`  | `/api/items/:id` | Update fields                      |
| `DELETE` | `/api/items/:id` | Delete item                        |
