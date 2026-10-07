# FHIR

## Supported resources (demo validation)

`Patient`, `Observation`, `Condition`, `MedicationRequest`,
`DiagnosticReport`, `Encounter`, `CarePlan`.

## Validation rules (demo)

- `resourceType` must be one of the supported types.
- `id` or `identifier` required.
- `Patient` requires `name`.
- `Observation` requires `code`.

## Import flow

`POST /api/fhir/import` with a single FHIR resource JSON (or
`{ "resource": {...}, "patientId": "..." }`). The resource is persisted with a
`VALID`/`INVALID` status; invalid payloads are rejected with a 400 error
describing the failing checks, and the event is written to the audit log.

No real hospital FHIR server is required for the prototype; seed data includes
synthetic `Patient` resources. In production, replace `FhirValidationService`
and the import path with a full FHIR R4 validator (e.g. HAPI FHIR) and protect
server connections with SMART on FHIR OAuth2.
