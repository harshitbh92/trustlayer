# TrustLayer

A Social Trust & Compatibility Platform — public identity, anonymous discovery, and a tag-based reputation system that measures interaction quality rather than human worth.

## Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS
- **Backend:** NestJS (REST + Socket.io)
- **Database:** PostgreSQL 16 + Prisma 6
- **Cache / Match queue:** Redis 7
- **Auth:** Email/password + JWT (bcrypt, stored in PostgreSQL)

## Monorepo

```
apps/
  web/                 Next.js user-facing app
  api/                 NestJS API + WebSocket gateway
packages/
  shared/              Zod schemas, enums, DTOs, personality questions
  reputation-engine/   Pure TS scoring + tag assignment
```

## Local development

1. Copy env files:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.local.example apps/web/.env.local
   ```
2. Start infrastructure:
   ```bash
   docker compose up -d
   ```
3. Install and prepare:
   ```bash
   npm install
   npm run build:packages
   npm run db:migrate -w @trustlayer/api
   npm run db:seed -w @trustlayer/api
   ```
4. Run web + api:
   ```bash
   npm run dev
   ```

- Web: http://localhost:3000
- API: http://localhost:4000

## Auth

- `POST /api/auth/register` — email, password, username, displayName
- `POST /api/auth/login` — email, password → `{ token, user }`
- `GET /api/auth/me` — Bearer JWT

The web app stores the JWT in `localStorage` and sends it on every API request.

## Admin security dashboard

Admins (`role: ADMIN`) get an **Admin** link in the nav → http://localhost:3000/admin

**Setup:** set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_USERNAME` in `apps/api/.env`, then:

```bash
npm run db:seed -w @trustlayer/api
```

Or promote any user in Prisma Studio: set `User.role` to `ADMIN`.

**API (admin JWT required):**

- `GET /api/admin/stats` — platform safety overview
- `GET /api/admin/reports?status=OPEN` — report queue
- `PATCH /api/admin/reports/:id` — review / dismiss
- `POST /api/admin/moderation` — warn, shadowban, suspend, or ban
- `GET /api/admin/moderation` — audit log
- `GET /api/admin/users?q=` — search users
- `PATCH /api/admin/users/:id/role` — change role

Bans and active suspensions block API access until expiry (for suspensions).

## GitHub & deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for pushing to GitHub and hosting the API + web app in production (Vercel, Railway, Neon, etc.).

## Phase 1 scope

Auth, personality onboarding, social feed, discover & connect, anonymous text chat with feel-based feedback, and tag-based reputation. No public numeric scores; negative data stays internal.
