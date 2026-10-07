# AI / ML Module

`demo_ai_service.py` exposes a FastAPI endpoint (`POST /predict/cardiovascular`)
that returns **simulated** cardiovascular risk predictions. The main backend
currently implements an equivalent synthetic predictor inline; this service is a
drop-in extension point.

## Federated learning architecture (prototype)

```
Hospital A ─┐
Hospital B ─┼─> secure aggregation (simulated) ─> global model ─> validation ─> deployment
Hospital C ─┤
Hospital D ─┘
```

- Each node trains locally; only model updates would be shared in production.
- The demo dashboard (`/federated-learning`) reports round counts, loss, and
  accuracy as synthetic metrics.
- Real deployment (TensorFlow Federated) additionally requires differential
  privacy, secure aggregation, and legal/IRB review. The prototype does not
  claim these guarantees.

## Running

```bash
pip install -r requirements.txt
uvicorn demo_ai_service:app --port 8000
```

All outputs are labeled `synthetic: true` and must not be presented as
clinically validated results.
