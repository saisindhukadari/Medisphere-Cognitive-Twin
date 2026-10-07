"""Synthetic demonstration AI service for the MediSphere Cognitive Twin platform.

This service is a clean integration point for real models. It currently returns
clearly-labeled simulated predictions. In a production setup, replace this with
a trained model (e.g. TensorFlow / TensorFlow Federated) behind the same contract.
"""

from fastapi import FastAPI
from pydantic import BaseModel
import random

app = FastAPI(title="MediSphere AI Demo Service", version="1.0.0")


class RiskRequest(BaseModel):
    age: int
    hba1c: float
    systolic_bp: int
    bmi: float
    smoker: bool = False


@app.get("/health")
def health():
    return {"status": "ok", "synthetic": True}


@app.post("/predict/cardiovascular")
def predict_cardiovascular(req: RiskRequest):
    risk = 5 + (req.age - 30) * 0.4 + (req.hba1c - 5) * 4 + (req.systolic_bp - 120) * 0.15 + (req.bmi - 22) * 0.8
    if req.smoker:
        risk += 8
    risk = max(1.0, min(60.0, round(risk, 1)))
    return {
        "ten_year_cardiovascular_risk": risk,
        "risk_category": "HIGH" if risk >= 20 else ("MEDIUM" if risk >= 10 else "LOW"),
        "confidence": round(0.7 + random.random() * 0.25, 2),
        "model_version": "ai-demo-service-v1.0",
        "synthetic": True,
        "disclaimer": "Simulated output of a demonstration model. Not clinically validated, not medical advice.",
    }
