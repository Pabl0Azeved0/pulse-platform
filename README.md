# ⚡ Pulse

A full-stack, real-time social network — built to work with the hard parts of modern web
architecture end to end: **code-first GraphQL**, **live subscriptions over Redis**, **fully
async Python**, and a **normalized-cache React client**. Users post, thread comments, like,
follow, search, and see new posts appear live.

> A portfolio project built to go deep on real-time GraphQL and async backend design —
> not a product. It runs end to end under Docker; see **Known limitations** for the honest
> state of what's production-ready and what isn't.

---

## Highlights

- **Real-time feed** — new posts stream to connected clients via a GraphQL subscription
  backed by Redis pub/sub (`broadcaster`), so the timeline updates without a refresh.
- **Token-authenticated GraphQL** — every mutation derives the acting user from a verified
  JWT (`python-jose` + bcrypt), not from client-supplied arguments.
- **Threaded comments** — self-referential comment model with recursive replies, rendered
  client-side at increasing depth.
- **Optimistic UI on a normalized cache** — likes, comments, and follows update instantly
  via Apollo's `cache.modify` / `writeFragment`, then reconcile with the server.
- **Async all the way down** — FastAPI + async SQLAlchemy + asyncpg; no blocking calls in
  the request path.
- **Docker-first, dev and prod** — one command brings up Postgres, Redis, backend, and
  frontend; a separate prod compose serves the built SPA via nginx.
- **CI** — GitHub Actions spins up the stack and runs the backend test suite on every push.

---

## Architecture

```
React / Apollo (Vite, :5173)  ──HTTP GraphQL──►  FastAPI + Strawberry (:8000)
        │  Bearer JWT in every request              │  async SQLAlchemy
        │  REST multipart → /upload                 ▼
        └──────────────────────────────►      PostgreSQL (:5432)
                                                   │
                            new_post subscription ◄┴► Redis (broadcaster, :6379)
```

- **Backend:** FastAPI + **Strawberry** (code-first GraphQL) · async **SQLAlchemy** on
  **PostgreSQL** (asyncpg) · **Redis** pub/sub for subscriptions · JWT auth.
- **Frontend:** React 18 + TypeScript + Vite + **Apollo Client** (normalized cache) +
  React Router + Tailwind.
- **Data model:** `User 1─* Post`, `Post 1─* Comment`, `Comment 1─* Comment` (threaded),
  polymorphic `Like` (post *or* comment), `Follow` join.

### Two design decisions worth calling out

**Hybrid uploads (REST + GraphQL).** Binary uploads go to a small REST `/upload` endpoint
that stores the file and returns a URL; that URL is then passed to a GraphQL mutation. This
keeps the GraphQL schema free of multipart concerns and makes swapping the storage backend
(e.g. to S3) a localized change.

**Normalized cache over refetching.** Because Apollo caches by entity ID, following a user
on the Search page updates that user everywhere they appear (e.g. their Profile) with no
extra network round-trip — the components share the same cached entity.

---

## Quick start

**Prerequisites:** Docker & Docker Compose.

```bash
git clone https://github.com/Pabl0Azeved0/pulse-platform.git
cd pulse-platform
cp .env.example .env        # then edit SECRET_KEY and DB creds

make restart-full           # builds images, starts db + redis + backend + frontend
make populate-db            # optional: seed demo users (password: pulse) + sample posts
```

Once up:

- **Frontend:** http://localhost:5173
- **GraphQL:** http://localhost:8000/graphql
- **REST/API docs:** http://localhost:8000/docs

### Common commands

| Command | What it does |
|---|---|
| `make restart` | Rebuild + restart backend/frontend (keeps DB data) |
| `make restart-db` | Wipe the DB volume and start fresh |
| `make populate-db` | Seed demo users and posts |
| `make test` | Run the backend test suite (`pytest`) in the container |
| `make format` | Black (Python) + Prettier (frontend) |
| `make prod` | Run the nginx production compose |

---

## Tech stack

- **Backend:** FastAPI · Strawberry GraphQL · SQLAlchemy (async) · asyncpg · Redis
  (`broadcaster`) · python-jose (JWT) · passlib/bcrypt
- **Frontend:** React 18 · TypeScript · Vite · Apollo Client · React Router · Tailwind
- **Infra:** Docker Compose (dev + prod/nginx) · Makefile · GitHub Actions CI
- **Tests:** pytest (backend, against in-memory SQLite via an httpx ASGI client)

---

## Project structure

```
pulse-platform/
├── backend/
│   ├── auth.py            # password hashing + JWT create/verify
│   ├── events.py          # Redis broadcaster for subscriptions
│   ├── main.py            # FastAPI entrypoint, CORS, /upload, GraphQL router
│   ├── models.py          # async SQLAlchemy models
│   ├── schema.py          # Strawberry types, queries, mutations, subscription
│   └── tests/             # pytest suite
├── frontend/
│   └── src/
│       ├── components/    # Navbar, comment thread, modals, PulseWave
│       ├── context/       # AuthProvider / useAuth
│       ├── pages/         # Home, Feed, Login, Register, Profile, Search, Settings
│       └── apollo.ts      # Apollo client + auth link
├── docker-compose.yml         # dev
├── docker-compose.prod.yml    # prod (nginx)
├── Makefile
└── README.md
```

---

## Known limitations

Honest notes on what's solid and what's still rough — this is a learning-focused project,
and these are the things I'd harden before calling any of it production-grade:

- **Server-side like counts are partial.** Some read paths (comment nodes, and posts in the
  profile/search views) return a placeholder count that the client corrects optimistically;
  they aren't yet computed server-side everywhere. The feed path does compute them.
- **Alembic is scaffolded but inert.** The schema is currently created via
  `Base.metadata.create_all`; the initial migration is a no-op stub. Migrations aren't yet
  the source of truth — fine for dev, not for evolving a real schema.
- **Subscription fan-out is global.** `new_post` publishes every post to a single channel, so
  every connected client receives every new post — the live stream isn't filtered per user (the
  "Following" *query* is server-filtered, but the real-time append isn't). Per-user server-side
  fan-out is what a production system would add.
- **`created_at` is stored as an ISO string**, not a native DB timestamp — simple, but it
  gives up range queries and correct ordering guarantees a `DateTime` column would provide.
- **Local-disk uploads.** Files land on local disk under `/uploads`; the hybrid-upload design
  is meant to make an S3-style backend a small change, but that swap isn't implemented.

---

## License

MIT — see `LICENSE`.
