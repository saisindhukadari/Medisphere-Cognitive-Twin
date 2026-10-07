# Deployment

## Local (recommended for demo)

```bash
cp .env.example .env
docker compose up --build        # mongodb + kafka + backend + frontend
```

Or run infrastructure in Docker and the apps locally:

```bash
docker compose up -d mongodb kafka
cd backend && mvn spring-boot:run
cd frontend && npm ci && npm start
```

Set `SERVER_PORT`/`BACKEND_URL` if 8080 is occupied.

## Docker images

- `backend/Dockerfile` — multi-stage Maven build, JRE 25 runtime
- `frontend/Dockerfile` — Angular build + nginx with `/api` proxy

## Kubernetes

`infrastructure/k8s/medisphere.yaml` contains Deployments/Services for the
backend and frontend. In production you would additionally need managed
MongoDB, a Kafka cluster, TLS ingress, secrets management, and per-environment
configuration.

## Configuration

See `.env.example`. Key variables:

- `MONGODB_URI`, `KAFKA_BOOTSTRAP_SERVERS`, `KAFKA_ENABLED`
- `JWT_SECRET`, `JWT_ACCESS_EXPIRATION_MS`, `JWT_REFRESH_EXPIRATION_MS`
- `SEED_ENABLED`, `SIMULATOR_ENABLED`, `CORS_ALLOWED_ORIGINS`
