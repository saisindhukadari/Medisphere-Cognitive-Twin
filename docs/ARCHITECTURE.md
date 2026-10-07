# Architecture

```
Browser (Angular 20)
   │  HTTP + JWT (Bearer)
   ▼
Nginx / Angular dev server (proxies /api)
   ▼
Spring Boot 4 REST API  ──────────────┐
   │                 │                │
MongoDB           Kafka topics     /ai synthetic service (optional)
(twins, patients, patient.vitals)  /api/fhir/validate, /risk-predictions,
                  (simulator +      /care-plans, /alerts, /audit-logs...
                   rule engine)
```

## Backend packages

- `auth` — users, JWT (access + refresh), RBAC via `@PreAuthorize`
- `patient`, `healthtwin`, `vitals`, `labs` — twin store foundation
- `fhir` — R4 resource import/viewer + validation
- `consent` — consent categories, grant/withdraw, verification
- `risk`, `federated` — simulated federated models + SHAP-style explanations
- `monitoring`, `alerts` — device registry, rule engine, alert workflow
- `careplan` — AI (simulated) care-plan generation, approval workflow, adherence
- `provider`, `audit`, `notification`, `seed` — management, audit trail, seeding

## Data flow (vitals → alerts)

`VitalsSimulatorService` produces readings every ~15s → publishes to Kafka
topic `patient.vitals` (when `medisphere.kafka.enabled=true`, otherwise calls
`VitalsService.ingest` directly) → ingestion runs `RuleEngineService` → any
threshold breach creates an `Alert` and a `Notification`.

## MongoDB collections

patients, health_twins, vitals, lab_results, fhir_resources, risk_predictions,
fl_models, alerts, care_plans, consents, devices, users, providers,
audit_logs, notifications.

## Kafka topics

`patient.vitals`, `patient.alerts`, `fhir.resources`, `risk.predictions`,
`careplans.events` (handlers implemented for `patient.vitals`; others are
reserved for the production extension points).
