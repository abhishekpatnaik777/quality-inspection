# Quality Inspection

Boilerplate full-stack app: **React (Vite)** + **Node.js (Express)** + **PostgreSQL**.

## Structure

```
quality-inspection/
├── client/          # React frontend (Vite)
├── server/          # Express API
├── docker-compose.yml
└── package.json     # Root scripts
```

## Prerequisites

- Node.js 20+
- PostgreSQL (this machine already has **PostgreSQL 18** under `/Applications`)
- Docker is optional (`npm run db:docker`) if you prefer Compose instead

## Setup

```bash
# Install dependencies
npm run install:all

# Put your Postgres password in server/.env (set during PostgreSQL install)
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/quality_inspection

# Create DB + apply schema (uses local Postgres, not Docker)
npm run db:up
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

Default DB URL (see `server/.env`):

```
postgresql://postgres:postgres@localhost:5432/quality_inspection
```
