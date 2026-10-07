# API

Base URL: `/api`. All endpoints except `/api/auth/login|register|refresh`
require `Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/logout` |
| Users | `GET /users` (ADMIN), `PATCH /users/{id}/status` |
| Patients | `GET /patients?search=&risk=&consent=&providerId=&sort=&page=&size=`, `GET/POST/PUT /patients[/{id}]` |
| Health twins | `GET /health-twins/{patientId}` |
| Vitals | `GET /vitals/{patientId}`, `GET /vitals/patient/{patientId}`, `GET /vitals/latest`, `POST /vitals` |
| Labs | `GET /labs/{patientId}`, `GET /labs/patient/{patientId}`, `POST /labs` |
| FHIR | `GET /fhir/resources[?patientId=]`, `GET /fhir/resources/{id}`, `POST /fhir/import` (staff), `POST /fhir/validate` |
| Consents | `GET /consents[?patientId=]`, `POST /consents`, `DELETE /consents/{id}` |
| Risk | `GET /risk-predictions`, `GET /risk-predictions/{id}`, `GET /risk-predictions/patient/{patientId}`, `POST /risk-predictions/predict/{patientId}` (staff), `POST /risk-predictions/{patientId}/generate` (staff) |
| Models | `GET /models`, `POST /models/{id}/activate`, `POST /models/{id}/deactivate` (staff) |
| Federated learning | `GET /federated-learning` (staff) |
| Monitoring | `GET /monitoring/summary`, `GET /monitoring/devices` (staff) |
| Alerts | `GET /alerts?status=&page=&size=`, `GET /alerts/{id}`, `POST /alerts/{id}/status`, `POST /alerts/{id}/assign` (staff) |
| Care plans | `GET /care-plans[?patientId=]`, `GET /care-plans/patient/{patientId}`, `GET /care-plans/{id}`, `POST /care-plans/generate` (staff), `PUT /care-plans/{id}` (modify, staff), `POST /care-plans/{id}/approve\|reject\|sign\|complete\|activate` (staff), `GET /care-plans/{id}/adherence` |
| Providers | `GET/POST /providers`, `GET/PUT /providers/{id}` |
| Population/outcomes | `GET /population-health`, `GET /outcomes` (staff) |
| Search | `GET /search?q=` (patient role: scoped to own record) |
| Audit | `GET /audit-logs?user=&page=&size=` (staff) |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/mark-all-read`, `POST /notifications/{id}/read` |
| Reports | `GET /reports?type=`, `GET /reports/export?type=&format=csv` (staff) |
| Dashboard | `GET /dashboard/summary` (patient role: own-record KPIs) |
| Settings | `GET /settings/thresholds`, `POST /settings/thresholds` (staff; audited) |

## Role restrictions (data-level RBAC)

- `PATIENT` tokens are scoped to their own `patientId`: any request for another
  patient's record (patients, vitals, labs, twins, predictions, care plans,
  consents, alerts, FHIR) returns **403**, and list endpoints return only the
  caller's own rows.
- Staff-only endpoints (`@PreAuthorize`) return **403** for `PATIENT`.
- Invalid/missing tokens return **401** JSON.

## Conventions

- Pagination: `{ content: [], page, size, totalElements, totalPages }`
- Errors: `{ timestamp, status, error, message, path }` (e.g. 400/403/404/409/500)
- Validation errors list each failing field (`field message; ...`)
