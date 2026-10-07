# AI / ML

## What is simulated vs real

| Component | Status |
|---|---|
| Cardiovascular/diabetes risk scores | Simulated (backend service + `/ai` FastAPI demo) |
| SHAP-style feature contributions | Simulated, generated deterministically for the demo |
| Federated rounds, global accuracy/loss | Simulated dashboard metrics |
| Alert rule engine (thresholds) | Real rules, configurable thresholds via settings |

All simulated outputs carry a disclaimer and a `synthetic` flag. They must not
be presented to patients as real predictions.

## Model management

`/models` lists demo models with version, training date, dataset info,
validation results, accuracy and federated round. Activate/deactivate is
persisted; `GET /api/federated-learning` returns the aggregate node status.

## Extension points

- Swap `RiskPredictionService` with a real model behind the same API.
- Point the backend at the FastAPI service in `/ai` (`AI_SERVICE_URL`) for
  scoring.
- Use TensorFlow Federated for true multi-site training; add differential
  privacy and secure aggregation before any clinical use.
