# Security

Implemented controls (prototype):

- **Authentication:** JWT access + refresh tokens; bcrypt password hashing;
  stateless sessions.
- **Authorization (RBAC):** roles `SUPER_ADMIN`, `ADMIN`, `PROVIDER`,
  `CARE_MANAGER`, `PATIENT`; enforced on the API via Spring Security
  `@PreAuthorize` **and data-level scoping** (`AccessControlService`), on the UI
  via role route guards and role-aware navigation.
  - `PATIENT` users can only read their own patient record (patients, vitals,
    labs, digital twin, predictions, care plans, consents, alerts, FHIR) —
    requests for other patients' records return **403**, and list endpoints are
    filtered server-side to the caller's own record.
  - `PATIENT` is denied audit logs, monitoring, population health, reports,
    model management, FHIR import, user administration and alert/care-plan
    state transitions (403).
  - Missing or invalid bearer tokens return **401** JSON; insufficient
    permissions return **403** JSON (consistent error shape from the global
    exception handler).
- **Audit logging:** logins, logout, patient access/creation/update, FHIR
  imports, consent changes, risk generation, care-plan
  generation/modification/approval/signing, alert acknowledge/resolve, and
  settings/threshold changes. Passwords and tokens are never logged.
- **Input validation:** Jakarta Bean Validation on auth/patient payloads; FHIR
  resource validation service.
- **HTTP hardening:** CSP, frame denial, referrer policy, CORS locked to
  configured origins.
- **Secrets:** only via environment variables (`.env.example`); no secrets are
  committed.

## NOT claimed

- This project is **not** HIPAA certified, SOC 2 audited, or FDA cleared.
- The federated-learning flow is a simulation; differential privacy and secure
  aggregation are not actually implemented.
- Production use additionally requires TLS termination, WAF, secrets
  management, field-level encryption/KMS, session revocation, rate-limit
  tuning, penetration testing, and legal/compliance review.
