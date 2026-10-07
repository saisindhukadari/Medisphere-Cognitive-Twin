# MediSphere Cognitive Twin — AI Health Prediction Platform

A full-stack healthcare management platform: Angular 20 frontend, Spring Boot 4
backend (Java 25), MongoDB, Apache Kafka, FHIR R4 validation, simulated
federated-learning risk models, real-time vitals monitoring, alert workflow,
and provider-approved AI care plans.

> **Important:** All patient data is synthetic. Model outputs and the care-plan
> generator are simulated and clearly labeled. This project implements a
> security/audit *architecture* as a prototype; it is **not** HIPAA certified
> and is not medical advice.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Then open http://localhost:4200 (frontend) and http://localhost:8080 (backend API).
MongoDB and Kafka run in the same compose stack; the backend seeds a synthetic
dataset on first start (`SEED_ENABLED=true`).

## Quick start (local dev, without Docker for app code)

```bash
docker compose up -d mongodb kafka      # infrastructure only
cd backend && mvn spring-boot:run       # API on :8080 (dev here uses SERVER_PORT=8081)
cd frontend && npm ci && npx ng serve   # UI on :4300 (proxies /api to :8081)
```

Default development ports in this workspace:

| Service | Port | Notes |
|---|---|---|
| Angular dev server | **4300** | configured in `frontend/angular.json` (`serve.port`) |
| Spring Boot API | **8081** | `SERVER_PORT=8081 java -jar backend/target/backend-1.0.0.jar` |
| Angular proxy | `/api/*` → `http://localhost:8081` | `frontend/proxy.conf.js` (`BACKEND_URL` env overrides) |
| MongoDB | 27017 | local `mongod` or `docker compose up -d mongodb` |
| Kafka | 9092 | optional — when unavailable the app runs in **simulation mode** (`KAFKA_ENABLED=false`) |

CORS is configured from `CORS_ALLOWED_ORIGINS` (defaults to
`http://localhost:4300,http://localhost:4200`) — it is environment-driven, not
hardcoded to a single origin.

## Synthetic seed data

The backend seeds an idempotent synthetic dataset (`demo-seed-v3`, guarded by a
`seed_markers` document) on first start. An interrupted seed run is detected and
repaired automatically on the next start (demo collections are rebuilt, user
accounts are preserved).

Seeded data (all fictional): 50 patients (high/medium/low risk mixes with
hypertension, diabetes, cardiovascular and healthy profiles), 7 doctors
(backend role `PROVIDER`), 50 digital twins, 3,500 vital readings (14 days x 5
types per patient), 500 lab results, a risk-prediction history for every
patient, 35 care plans, 150+ alerts spread across 7 days, 350+ FHIR resources,
100 consents, devices, models, notifications and a 40-event audit trail.

Disable with `SEED_ENABLED=false`.

## Demo accounts (development only)

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@medisphere.demo | Admin@12345 |
| Admin | admin2@medisphere.demo | Admin@12345 |
| Doctor | provider@medisphere.demo | Provider@123 |
| Doctor | provider2@medisphere.demo | Provider@123 |
| Care Manager | caremanager@medisphere.demo | Care@12345 |
| Patient | patient@medisphere.demo | Patient@123 |

The UI shows the friendly label **Doctor** for the backend role `PROVIDER`;
role names are never renamed on the API/DB side.

## Test commands

```bash
cd backend && mvn test                                  # backend unit tests
cd frontend && npx ng test --browsers=ChromeHeadless --watch=false
cd frontend && npx ng build                             # production build

# End-to-end API smoke test (login, seed counts, risk, care plan, alerts,
# FHIR, RBAC/role restrictions, auth) — requires backend running on :8081
powershell -ExecutionPolicy Bypass -File infrastructure/e2e-smoke.ps1
```

## Verification (last full run)

| Check | Command | Result |
|---|---|---|
| Backend unit tests | `cd backend && mvn test` | **15/15 pass**, `BUILD SUCCESS` |
| Frontend unit tests | `cd frontend && npx ng test --watch=false` | **2/2 pass** (Chrome 154) |
| Production build | `cd frontend && npx ng build` | **0 errors** (exit 0); initial bundle 660.60 kB — over the 500 kB budget warning, see `angular.json` |
| API smoke suite | `infrastructure/e2e-smoke.ps1` | **72/72 pass, 0 fail** |
| Health (no auth) | `GET /api/health` | `{"status":"UP","database":"CONNECTED"}` |
| Unauthenticated export | `GET /api/reports/export` | `401` |
| Seeded census | `GET /api/...` | 50 patients · 152 alerts · 36 care plans · 50 twins · 50 predictions · 100 consents · 50 devices · 97 audit events |
| Seed version | MongoDB `seed_markers` | `demo-seed-v3` (idempotent) |

Browser walkthrough (dev servers on `:4300` + `:8081`): home page hero
(its CTAs switch to *Open Dashboard / Sign out* once a session exists), the
sidebar **Home** entry back to `/`, signup/login with demo-account fill and
remember-me, dashboard (real `loggedInUser` greeting, 8 KPI cards,
distribution/coverage and volumes stat panels, a 7-day activity table,
care-journey meters and high-risk table — chart widgets are intentionally
removed from the dashboard), patients list, Patient 360 (12 tabs),
digital-twin body map, risk detail (SHAP chart + trend + history), care-plan
detail (**downloaded PDF verified: `%PDF-1.4`, 3,651 bytes, plan content +
disclaimer**), reports (**downloaded CSV verified: 7,485 bytes**), alerts
(filters + critical-only toggle narrowing 50 rows → 10), monitoring, and
Settings (dark theme applied to `data-theme`, accent swatch changing
`--accent` across the shell).

## Appearance preferences

`/settings` provides Light/Dark/System themes, six accent-color presets plus a
custom color picker, compact sidebar, reduced motion, dense tables, tooltip and
monitoring/notifications toggles. Preferences persist in `localStorage` and are
applied instantly app-wide via `AppearanceService`.

## Limitations

This application uses synthetic/demo healthcare data and simulated AI/ML
behavior where production models are unavailable. It is a prototype and is
**not HIPAA certified**. Production deployment requires appropriate security
controls, privacy controls, clinical validation, infrastructure hardening,
legal review, and regulatory/compliance assessment.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/API.md](docs/API.md)
- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/FHIR.md](docs/FHIR.md)
- [docs/AI_ML.md](docs/AI_ML.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/DEMO.md](docs/DEMO.md)

## Repository layout

```
frontend/     Angular 20 SPA
backend/      Spring Boot 4 REST API (JWT auth, MongoDB, Kafka, seed data)
ai/           FastAPI synthetic prediction service + TF Federated architecture notes
infrastructure/  Kubernetes manifests
docs/         Documentation
docker-compose.yml
```
