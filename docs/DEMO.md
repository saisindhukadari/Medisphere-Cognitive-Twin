# Demo Walkthrough

Dev ports: frontend **http://localhost:4300**, API **http://localhost:8081**
(`/api` is proxied by the Angular dev server).

1. Open http://localhost:4300 — marketing site.
2. `/register` or sign in with a demo account (see README).
3. Dashboard — KPIs, risk distribution, alert/risk widgets.
4. Patients → row → `360` opens the Patient 360 tabs.
5. `/patients/:id/digital-twin` — click body regions for region info.
6. FHIR → validate/import a resource; see it in the table.
7. Consent — grant/withdraw categories.
8. Risk Predictions → patient → SHAP-style chart → "Generate new prediction".
9. Federated Learning / Models — activate/deactivate a model.
10. Monitoring — live vitals table (auto-refreshes, simulator on).
11. Alerts — acknowledge/resolve/false-positive.
12. Care Plans → Generate with AI → open → Approve/Sign (provider role).
13. Population Health, Providers (admin), Audit Logs, Reports (CSV export),
    Notifications, Settings (theme Light/Dark/System, accent colors,
    preferences, alert thresholds saved via `POST /api/settings/thresholds`),
    Profile (change password).
14. Header search — patients/alerts/care plans/FHIR resources.
15. Logout (with confirmation) — token cleared; `/dashboard` redirects to `/login`.
16. As `patient@medisphere.demo`: dashboard shows "My Health Dashboard",
    "My Health Record" opens the own Patient 360, and admin/audit/population
    routes are blocked (route guard + API 403).

Every sensitive action above writes an audit event under `/audit-logs`.
