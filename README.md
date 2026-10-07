# MediSphere Cognitive Twin 🏥

## AI Health Prediction & Digital Twin Platform

**MediSphere Cognitive Twin** is a full-stack healthcare management platform that combines **FHIR interoperability, digital patient twins, AI-assisted risk prediction, real-time monitoring, clinical alerts, and personalized care plans**.

The project is developed across **4 milestones**, with each milestone adding a major part of the healthcare workflow.

> **Disclaimer:** All patient data is synthetic. AI predictions, monitoring results, and care-plan generation are simulated for demonstration purposes. This project is a prototype, is **not HIPAA certified**, and does not provide medical advice.

---

## 🚀 Project Overview

MediSphere Cognitive Twin creates a digital representation of patient health information and connects it with AI-assisted healthcare workflows.

The platform follows:

```text
Patient Data
     ↓
FHIR Integration
     ↓
Digital Patient Twin
     ↓
AI Risk Prediction
     ↓
Real-Time Monitoring
     ↓
Alerts & Notifications
     ↓
Personalized Care Plan
     ↓
Provider Approval
     ↓
Continuous Monitoring
```

---

## 🛠️ Technology Stack

| Component           | Technology                |
| ------------------- | ------------------------- |
| Frontend            | Angular 20                |
| Backend             | Spring Boot 4             |
| Language            | Java 25                   |
| Database            | MongoDB                   |
| Messaging           | Apache Kafka              |
| Healthcare Standard | FHIR R4                   |
| Authentication      | JWT                       |
| AI Service          | FastAPI                   |
| AI/ML               | Simulated Risk Prediction |
| Explainability      | SHAP-style explanations   |
| Deployment          | Docker / Kubernetes       |

---

# 📌 Milestone 1 — FHIR Integration & Digital Twin

The first milestone establishes the healthcare data foundation and creates the digital patient twin.

### Features

* FHIR R4 integration
* Patient, Condition, Observation and MedicationRequest resources
* JSON-to-FHIR mapping
* FHIR validation
* MongoDB patient-twin storage
* Digital patient twin creation
* Kafka-based vitals streaming
* Patient 360 dashboard
* Consent management
* Role-based access control
* Audit logging

### Workflow

```text
EHR / Wearables / Labs
        ↓
     FHIR API
        ↓
      Kafka
        ↓
     MongoDB
        ↓
 Digital Patient Twin
        ↓
 Patient 360
```

---

# 🤖 Milestone 2 — AI Risk Prediction

The second milestone introduces AI-assisted health-risk prediction using a simulated federated-learning architecture.

### Features

* Cardiovascular risk prediction
* Diabetes complication prediction
* Risk prediction history
* Model versioning
* Prediction confidence
* SHAP-style explanations
* Risk-factor visualization
* Provider review

### Workflow

```text
Patient / Twin Data
       ↓
    AI Model
       ↓
 Risk Prediction
       ↓
Confidence + Explanation
       ↓
 Provider Review
```

> AI outputs are simulated and intended only for demonstration.

---

# 📡 Milestone 3 — Monitoring & Alerts

The third milestone adds continuous monitoring of patient vitals and clinical alerts.

### Features

* Real-time vital monitoring
* Wearable/device data
* Kafka event streaming
* Anomaly detection simulation
* Clinical rule engine
* Alert generation
* Critical-alert filtering
* Provider notifications
* Alert acknowledgment
* Monitoring dashboard

### Workflow

```text
Wearable / Device
       ↓
 Vital Reading
       ↓
     Kafka
       ↓
Monitoring Engine
       ↓
Anomaly Detection
       ↓
 Alert
       ↓
Provider Notification
```

---

# 🧑‍⚕️ Milestone 4 — Care Plans & Preventive Intervention

The fourth milestone connects risk predictions and monitoring results with personalized care planning.

### Features

* AI-assisted care-plan generation
* Personalized health goals
* Intervention tracking
* Adherence tracking
* Outcome measurement
* Provider collaboration
* Provider approval
* Progress tracking
* Care-plan PDF export

### Workflow

```text
Risk Prediction
      ↓
Risk Factors
      ↓
Care Plan Generation
      ↓
Safety / Guideline Checks
      ↓
Provider Review
      ↓
Provider Approval
      ↓
Intervention
      ↓
Outcome Tracking
```

---

# 🖥️ Main Application Modules

The integrated application includes:

* 🏠 Home
* 🔐 Login & Registration
* 📊 Dashboard
* 👥 Patient Management
* 🩺 Patient 360
* 🧬 Digital Twin
* 🤖 AI Risk Prediction
* 📡 Real-Time Monitoring
* 🚨 Alerts
* 🧑‍⚕️ Care Plans
* 📑 Reports
* ⚙️ Settings
* 🔐 Security & Audit

---

# 🔒 Security & Privacy

The project demonstrates a prototype security architecture using:

* JWT authentication
* Role-based access control
* Patient/provider access restrictions
* Consent management
* Audit logging
* Protected APIs
* Session management
* Environment-based CORS configuration

> This application is **not HIPAA certified**. Production deployment would require appropriate security controls, privacy protection, clinical validation, legal review, and regulatory assessment.

---

# 🧪 Synthetic Data

All healthcare information is **fictional and synthetic**.

The demo dataset can include:

* Patients
* Providers
* Digital twins
* Vital readings
* Laboratory results
* Risk predictions
* Care plans
* Alerts
* FHIR resources
* Consents
* Devices
* Notifications
* Audit events

Synthetic data seeding can be controlled using:

```text
SEED_ENABLED=true
```

---

# 🐳 Quick Start

### Clone the Repository

```bash
git clone <your-repository-url>
cd Medisphere-Cognitive-Twin
```

### Configure Environment

```bash
cp .env.example .env
```

### Start with Docker

```bash
docker compose up --build
```

Frontend:

```text
http://localhost:4200
```

Backend:

```text
http://localhost:8080
```

---

# 💻 Local Development

### Start MongoDB and Kafka

```bash
docker compose up -d mongodb kafka
```

### Backend

```bash
cd backend
mvn spring-boot:run
```

Development backend:

```text
http://localhost:8081
```

### Frontend

```bash
cd frontend
npm ci
npx ng serve
```

Development frontend:

```text
http://localhost:4300
```

---

# 🧪 Testing

### Backend

```bash
cd backend
mvn test
```

### Frontend

```bash
cd frontend
npx ng test --browsers=ChromeHeadless --watch=false
```

### Production Build

```bash
cd frontend
npx ng build
```

### API Smoke Test

```powershell
powershell -ExecutionPolicy Bypass -File infrastructure/e2e-smoke.ps1
```

The smoke test verifies authentication, RBAC, FHIR workflows, risk predictions, care plans, alerts, and protected APIs.

---

# 📁 Repository Structure

```text
Medisphere-Cognitive-Twin/
│
├── frontend/              # Angular 20 application
├── backend/               # Spring Boot 4 REST API
├── ai/                    # FastAPI & AI/ML architecture
├── infrastructure/        # Docker, Kubernetes & E2E
├── docs/                  # Project documentation
├── docker-compose.yml
├── .env.example
└── README.md
```

---

# 📚 Documentation

Additional documentation:

```text
docs/ARCHITECTURE.md
docs/API.md
docs/SECURITY.md
docs/FHIR.md
docs/AI_ML.md
docs/DEPLOYMENT.md
docs/DEMO.md
```

---

# 🎯 Project Objective

The main objective of **MediSphere Cognitive Twin** is to demonstrate how **FHIR, digital twin technology, AI-assisted risk prediction, real-time monitoring, clinical alerts, and preventive care planning** can be integrated into a single healthcare management platform.

The complete milestone progression is:

```text
FHIR + Digital Twin
        ↓
AI Risk Prediction
        ↓
Monitoring + Alerts
        ↓
Care Plans + Intervention
        ↓
Integrated Healthcare Platform
```

---

# ⚠️ Disclaimer

MediSphere Cognitive Twin is a **prototype/demo healthcare application**.

All patient data is synthetic. AI predictions, anomaly detection, and care-plan generation are simulated where production models are unavailable.

This project:

* Is not HIPAA certified
* Is not a medical device
* Does not provide medical advice
* Must not be used for real clinical decision-making
* Should not be deployed with real patient data without appropriate security and compliance controls

**MediSphere Cognitive Twin — Integrated Healthcare Prototype 🏥**
