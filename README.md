# CompTrack

CompTrack is an open source comp-off management solution with overtime credit and comp-off debit workflows.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: NestJS + TypeScript
- Identity: Database-backed local authentication + JWT + RBAC
- Database: PostgreSQL for deployment, SQLite optional for local-only quick runs
- Cache/queue: Redis
- API contract: OpenAPI 3.0

## Existing Artifacts
- SQL schema: `database/schema.sql`
- OpenAPI: `openapi/openapi.yaml`
- Infra stack: `docker-compose.yml`

## App Skeleton
- Backend source: `backend/`
- Frontend source: `frontend/`

## Local Run Without Docker
1. Install backend dependencies:
  ```bash
  cd backend
  npm install
  ```
2. Start backend with embedded SQLite:
  ```bash
  npm run dev:local
  ```
3. In another terminal, start frontend:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
4. Open services:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080/api/v1`
- Swagger: `http://localhost:8080/docs`

## Local Database
- For local SQLite quick run, set `DATABASE_URL="file:./dev.db"` in `backend/.env`.
- Roles and default policy are seeded automatically on backend startup.
- Demo users/demo data are seeded only when `NODE_ENV != production`.

## Free Internet Deployment (Recommended)
Use this combo:
- Frontend: Vercel (free)
- Backend API: Render (free tier)
- Database: Supabase Postgres (free)

### 1. Supabase (Database)
1. Create a Supabase project.
2. Copy the Postgres URI and set it as `DATABASE_URL` in Render.
3. Use SSL-enabled URI from Supabase connection settings.

### 2. Render (Backend)
1. Connect this repo to Render.
2. Use `render.yaml` from repo root (Blueprint deploy) or configure manually:
- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm run start:prod`
3. Set env vars:
- `NODE_ENV=production`
- `DATABASE_URL=<supabase-postgres-url>`
- `JWT_SECRET=<long-random-secret>`
- `JWT_EXPIRES_IN=1d`
- `CORS_ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app`

### 3. Vercel (Frontend)
1. Import the same repo in Vercel.
2. Set project root directory to `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add env var:
- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api/v1`

### 4. Post-deploy checks
1. Open frontend URL.
2. Sign in with a production-created admin/employee account (do not use demo credentials).
3. Verify API docs are reachable at `https://<render-service>.onrender.com/docs`.
4. Confirm CORS only allows your frontend domain.

## Optional Docker Setup
1. Start infra and app containers:
  ```bash
  docker compose up -d --build
  ```

## Authentication and Authorization
- Roles are stored in database:
  - `employee`
  - `manager`
  - `hr_admin`
  - `super_admin`
- Backend signs and validates local JWT access tokens.
- Backend role guard protects endpoints.
- Route-level role checks are implemented in controllers.
- First-time setup uses `POST /api/v1/auth/bootstrap-admin` to create the initial super admin.
- Employees can self-register with `POST /api/v1/auth/register` and log in with `POST /api/v1/auth/login`.

## What is Placeholder vs Production
- Placeholder now:
  - None in core auth and workflow path; frontend is wired to backend APIs.
- Production-ready foundations already present:
  - DB schema with ledger model and overdraft checks.
  - Local JWT authentication with database-backed roles.
  - OpenAPI endpoints and payload definitions.
  - Containerized multi-service architecture.

## Next Build Steps
1. Implement Prisma models for all tables and generate migrations.
2. Implement expiry job to create `expiry` debit ledger entries.
3. Add unit, integration, and e2e tests.
4. Add custom domains and monitoring/alerts.
