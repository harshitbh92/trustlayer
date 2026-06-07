# Deployment guide

This doc covers pushing TrustLayer to GitHub and deploying a live environment.

## Before you push

- **Never commit secrets.** `apps/api/.env` and `apps/web/.env.local` are gitignored.
- Copy examples locally:
  ```bash
  cp apps/api/.env.example apps/api/.env
  cp apps/web/.env.local.example apps/web/.env.local
  ```
- If you previously put real passwords in `.env`, rotate them before going public.

## GitHub

```bash
git init
git add .
git commit -m "Initial commit: TrustLayer monorepo"
gh repo create Reputation --private --source=. --remote=origin --push
```

Replace `Reputation` with your preferred repo name. Use `--public` if you want an open-source repo.

## Recommended production architecture

| Service | Suggested host | Notes |
|---------|----------------|-------|
| PostgreSQL | [Neon](https://neon.tech), [Supabase](https://supabase.com), or Railway Postgres | Set `DATABASE_URL` |
| Redis | [Upstash](https://upstash.com) or Railway Redis | Set `REDIS_URL` |
| API (NestJS) | [Railway](https://railway.app) or [Render](https://render.com) | WebSockets + file uploads |
| Web (Next.js) | [Vercel](https://vercel.com) | Set `NEXT_PUBLIC_API_URL` to your API URL |

### API environment variables

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=4000
JWT_SECRET=<long-random-string>
CORS_ORIGIN=https://your-web-app.vercel.app
API_PUBLIC_URL=https://your-api.up.railway.app
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=TrustLayer <you@domain.com>
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
ADMIN_USERNAME=admin
```

After deploy, run migrations once:

```bash
npm run db:migrate:deploy -w @trustlayer/api
npm run db:seed -w @trustlayer/api
```

### Web environment variables

```
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
```

### File uploads

Uploaded images/videos are stored on the API server disk (`apps/api/uploads/`). For production, either:

- Mount persistent volume on Railway/Render, **or**
- Replace local storage with S3/Cloudflare R2 (future improvement).

### Build commands

**API (Railway/Render):**

```bash
npm install
npm run build:packages
npm run db:generate -w @trustlayer/api
npm run build -w @trustlayer/api
npm run start -w @trustlayer/api
```

**Web (Vercel):**

- Root directory: repo root (or configure monorepo)
- Build: `npm run build -w @trustlayer/web`
- Output: Next.js default

## Smoke test after deploy

1. Register / log in on the web URL
2. Complete onboarding questionnaire
3. Open Discover, Feed, Messages
4. Send a connection request and a DM
5. Confirm WebSocket chat (Random + Messages) connects

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | `CORS_ORIGIN` must exactly match web origin (no trailing slash) |
| API 401 everywhere | Check `JWT_SECRET` is set and consistent across redeploys |
| Uploads 404 | Set `API_PUBLIC_URL` to public API base URL |
| WebSockets fail | Ensure host supports WebSockets; avoid mixing http/https |
| DB errors | Run `db:migrate:deploy`; verify `DATABASE_URL` |
