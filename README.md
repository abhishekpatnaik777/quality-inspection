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

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health + DB check |
| `GET` | `/api/items` | List items |
| `GET` | `/api/items/:id` | Get one item |
| `POST` | `/api/items` | Create `{ name, status?, notes? }` |
| `PATCH` | `/api/items/:id` | Update fields |
| `DELETE` | `/api/items/:id` | Delete item |
