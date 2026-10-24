# Quality Inspection

Boilerplate full-stack app: **React (Vite)** + **Node.js (Express)** + **PostgreSQL (Prisma ORM)**.

## Structure

```
quality-inspection/
├── client/                 # React frontend (Vite)
├── server/
│   ├── prisma/             # Prisma schema, migrations, seed
│   └── src/                # Express API (Prisma client)
├── scripts/                # DB setup helpers
└── package.json            # Root scripts
```

## Prerequisites

- Node.js 20+
- [Postgres.app](https://postgresapp.com/) (or any local PostgreSQL)

## Setup

```bash
# Install dependencies
npm run install:all

# Start Postgres.app, then create DB + apply Prisma migrations + seed
npm run db:up
```

Prisma commands (from `server/`):

```bash
npm run prisma:migrate   # create/apply migrations in dev
npm run migrate          # deploy migrations + seed
npm run prisma:seed      # seed only
```

Schema source of truth: `server/prisma/schema.prisma`.

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

## Entities

### USER

| Field                   | Type                                  |
| ----------------------- | ------------------------------------- |
| id                      | serial                                |
| name                    | string                                |
| email                   | string (unique)                       |
| status                  | enum: `active`, `inactive`, `invited` |
| created_at / updated_at | timestamptz                           |
| created_by / updated_by | FK → users (nullable)                 |

### USER_ROLE

| Field                   | Type                                   |
| ----------------------- | -------------------------------------- |
| id                      | serial                                 |
| user_id                 | FK → users                             |
| role                    | enum: `quality_engineer`, `supervisor` |
| status                  | enum: `active`, `inactive`             |
| created_at / updated_at | timestamptz                            |
| created_by / updated_by | FK → users (nullable)                  |

### USER_SUPERVISOR

| Field                   | Type                                  |
| ----------------------- | ------------------------------------- |
| id                      | serial                                |
| user_id                 | FK → users (quality engineer, unique) |
| supervisor_id           | FK → users (supervisor)               |
| status                  | enum: `active`, `inactive`            |
| created_at / updated_at | timestamptz                           |
| created_by / updated_by | FK → users (nullable)                 |

Many quality engineers map to one supervisor (`user_id` is unique). Creating a **quality engineer** requires `supervisor_id` and inserts `user_roles` + `user_supervisors` in the same transaction.

UI: home has a **Users** tab → `/users` (search + add-user modal).

## Pre-commit checks

A Husky **pre-commit** hook runs automatically before every commit:

1. **Format check** — `prettier --check`
2. **Lint** — `oxlint` (client + server)
3. **Unit tests** — Node test runner (server) + Vitest (client)
4. **Security audit** — `npm audit` (root, server, client; fails on high+)

```bash
npm run precommit
```

## API

| Method             | Path                  | Description                     |
| ------------------ | --------------------- | ------------------------------- |
| `GET`              | `/api/health`         | Health + DB check               |
| `GET/POST`         | `/api/users`          | List (`?q=`) / create user+role |
| `GET/PATCH/DELETE` | `/api/users/:id`      | Read / update / delete user     |
| `GET/POST`         | `/api/user-roles`     | List / assign roles             |
| `GET/PATCH/DELETE` | `/api/user-roles/:id` | Read / update / delete role     |
