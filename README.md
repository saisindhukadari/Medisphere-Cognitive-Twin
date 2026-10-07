# MediSphere Cognitive Twin — AI Health Prediction Platform

A full-stack healthcare management platform for digital patient health twins, AI-based health-risk prediction, real-time vitals monitoring, clinical alerts, FHIR interoperability, and provider-approved care plans.

> **Important:** All patient data in this project is synthetic. AI/ML outputs and the care-plan generator are simulated and clearly labeled. This project demonstrates a prototype security and audit architecture. It is **not HIPAA certified** and is **not medical advice**.

---

## 🚀 Project Overview

**MediSphere Cognitive Twin** is an AI-enabled healthcare management platform that creates digital health twins for patients and integrates healthcare data from multiple sources.

The platform follows an integrated workflow across four milestones:

1. **FHIR Integration & Digital Twin Foundation**
2. **Federated Learning & AI Risk Prediction**
3. **Continuous Monitoring & Clinical Alerts**
4. **AI Care Plans & Preventive Intervention**

The project uses Angular 20 for the frontend, Spring Boot 4 with Java 25 for the backend, MongoDB for data storage, Apache Kafka for event streaming, and FHIR R4 for healthcare interoperability.

The system is designed as a prototype for demonstrating digital twin technology, healthcare AI, clinical decision support, monitoring, and preventive care workflows.

---

## 🏗️ Technology Stack

| Component                   | Technology                       |
| --------------------------- | -------------------------------- |
| Frontend                    | Angular 20                       |
| Backend                     | Spring Boot 4                    |
| Programming Language        | Java 25                          |
| Database                    | MongoDB                          |
| Messaging                   | Apache Kafka                     |
| Healthcare Interoperability | FHIR R4                          |
| Authentication              | JWT                              |
| AI/ML                       | Simulated Risk Prediction Models |
| Explainability              | SHAP-style explanations          |
| AI Service                  | FastAPI                          |
| Containerization            | Docker                           |
| Infrastructure              | Kubernetes                       |
| Data                        | Synthetic Healthcare Data        |

---

# 🔄 Integrated Project Workflow

The complete MediSphere workflow connects all four milestones:

```text
Patient / Provider
       ↓
Angular 20 Frontend
       ↓
Spring Boot REST API
       ↓
FHIR R4 Healthcare Data
       ↓
Kafka Event Streaming
       ↓
MongoDB Patient Data
       ↓
Digital Patient Twin
       ↓
AI Risk Prediction
       ↓
Real-Time Monitoring
       ↓
Alerts & Notifications
       ↓
AI-Assisted Care Plan
       ↓
Provider Review & Approval
       ↓
Patient Monitoring & Outcomes
```

The project specification describes this overall workflow as:

```text
Wearables + EHR + Labs
        ↓
     FHIR API
        ↓
      Kafka
        ↓
    MongoDB
        ↓
TensorFlow Federated
        ↓
Clinician Dashboard
        ↓
Preventive Intervention
```

---

# 🐳 Quick Start — Docker

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd Medisphere-Cognitive-Twin
```

### 2. Create the environment file

```bash
cp .env.example .env
```

### 3. Start the complete application

```bash
docker compose up --build
```

### 4. Open the application

Frontend:

```text
http://localhost:4200
```

Backend API:

```text
http://localhost:8080
```

MongoDB and Kafka are included in the Docker Compose stack.

The backend automatically seeds the synthetic demo dataset on first startup when:

```text
SEED_ENABLED=true
```

---

# 💻 Local Development

Docker can also be used only for infrastructure while running the Angular and Spring Boot applications locally.

### Start MongoDB and Kafka

```bash
docker compose up -d mongodb kafka
```

### Start the Spring Boot backend

```bash
cd backend
mvn spring-boot:run
```

The development backend runs on:

```text
http://localhost:8081
```

### Start the Angular frontend

```bash
cd frontend
npm ci
npx ng serve
```

The Angular development server runs on:

```text
http://localhost:4300
```

---

# 🔌 Development Ports

| Service       |     Port | Description                |
| ------------- | -------: | -------------------------- |
| Angular       |   `4300` | Development frontend       |
| Spring Boot   |   `8081` | Development backend API    |
| Angular Proxy | `/api/*` | Proxies requests to `8081` |
| MongoDB       |  `27017` | Database                   |
| Kafka         |   `9092` | Event streaming            |

The Angular proxy forwards:

```text
/api/*
```

to:

```text
http://localhost:8081
```

The backend URL can be overridden using:

```text
BACKEND_URL
```

---

# 🌐 CORS Configuration

CORS is environment-driven and is not hardcoded to a single frontend origin.

Default allowed origins:

```text
http://localhost:4300
http://localhost:4200
```

Configure using:

```text
CORS_ALLOWED_ORIGINS
```

---

# 🧪 Synthetic Demo Data

All healthcare information in the project is **fictional and synthetic**.

The backend creates an idempotent synthetic dataset using:

```text
demo-seed-v3
```

A `seed_markers` collection is used to track the seed version.

If a seed operation is interrupted, the next application startup detects the incomplete operation and repairs the demo collections automatically.

Existing user accounts are preserved.

---

# 📊 Seeded Dataset

The synthetic dataset contains:

* **50 patients**
* High-, medium-, and low-risk patient profiles
* Hypertension profiles
* Diabetes profiles
* Cardiovascular profiles
* Healthy profiles
* **7 doctors/providers**
* **50 digital twins**
* **3,500 vital readings**
* 14 days of vital data
* 5 vital types per patient
* **500 laboratory results**
* Risk-prediction history for every patient
* **35+ care plans**
* **150+ alerts**
* Alerts distributed across 7 days
* **350+ FHIR resources**
* **100 consents**
* Devices
* AI/ML model information
* Notifications
* Audit events

Disable synthetic seeding using:

```text
SEED_ENABLED=false
```

---

# 👤 Demo Accounts

> These accounts are for development/demo purposes only.

| Role         | Email                         | Password       |
| ------------ | ----------------------------- | -------------- |
| Super Admin  | `admin@medisphere.demo`       | `Admin@12345`  |
| Admin        | `admin2@medisphere.demo`      | `Admin@12345`  |
| Doctor       | `provider@medisphere.demo`    | `Provider@123` |
| Doctor       | `provider2@medisphere.demo`   | `Provider@123` |
| Care Manager | `caremanager@medisphere.demo` | `Care@12345`   |
| Patient      | `patient@medisphere.demo`     | `Patient@123`  |

The backend role remains:

```text
PROVIDER
```

The UI displays the friendly label:

```text
Doctor
```

Role names are not renamed in the API or database.

---

# 🩺 Milestone 1 — FHIR Integration & Digital Twin Foundation

Milestone 1 establishes the healthcare data foundation of the platform.

### Main Features

* FHIR R4 API integration
* Patient resource management
* Condition resources
* Observation resources
* MedicationRequest resources
* FHIR validation
* JSON-to-FHIR mapping
* MongoDB patient twin storage
* Digital patient twin creation
* Kafka-based vitals streaming
* Patient 360 dashboard
* Consent management
* RBAC
* Audit logging

### Patient 360

The Patient 360 interface provides a consolidated view of patient information including:

* Demographics
* Conditions
* Vitals
* Laboratory results
* Medications
* Digital twin
* Risk predictions
* Care plans
* Alerts
* Consent
* FHIR resources
* Audit information

The uploaded project specification identifies the core entities as:

```text
Patient
HealthTwin
Vitals
LabResult
RiskPrediction
Careplan
Alert
Provider
FHIRResource
FLModel
```

---

# 🤖 Milestone 2 — Federated Learning & Risk Prediction

Milestone 2 introduces AI-assisted health-risk prediction.

The architecture includes federated-learning concepts where models can be trained across healthcare environments without directly sharing patient data.

### Main Features

* Risk prediction
* Cardiovascular risk prediction
* Diabetes complication prediction
* Model versioning
* Federated-learning simulation
* SHAP-style explainability
* Risk history
* Prediction confidence
* Clinical evidence display

The project specification describes TensorFlow Federated as the intended technology for privacy-preserving machine learning. The current application uses simulated/demo AI behavior where production models are unavailable.

### Risk Prediction Workflow

```text
Patient Data
     ↓
FHIR / Digital Twin
     ↓
Risk Model
     ↓
Prediction
     ↓
Confidence Score
     ↓
Explainability
     ↓
Provider Review
```

AI predictions are clearly labeled as simulated/demo outputs.

---

# 📡 Milestone 3 — Continuous Monitoring & Alerts

Milestone 3 focuses on real-time patient monitoring.

Healthcare data from connected devices can be streamed through Kafka and processed by the monitoring workflow.

### Main Features

* Vital monitoring
* Device data
* Kafka event streaming
* Anomaly detection simulation
* Clinical rule engine
* Alert generation
* Alert filtering
* Critical-only filtering
* Notification workflow
* Alert acknowledgment
* Provider routing
* Monitoring dashboard

### Monitoring Workflow

```text
Wearable / Device
       ↓
   Vital Reading
       ↓
      Kafka
       ↓
Monitoring Engine
       ↓
Anomaly / Rule Detection
       ↓
      Alert
       ↓
Provider Notification
       ↓
Acknowledgment
```

---

# 🧑‍⚕️ Milestone 4 — AI Care Plans & Intervention

Milestone 4 connects AI risk predictions with preventive care planning.

The care-plan generator is simulated and does not provide real medical recommendations.

### Main Features

* Care-plan generation
* Personalized goals
* Intervention tracking
* Adherence tracking
* Outcome measurement
* Provider collaboration
* Provider approval workflow
* Care-plan status tracking
* Progress monitoring
* Care-plan PDF export

### Care Plan Workflow

```text
Risk Prediction
      ↓
Risk Factors
      ↓
Care Plan Generator
      ↓
Safety / Guideline Checks
      ↓
Provider Review
      ↓
Provider Approval
      ↓
Patient Intervention
      ↓
Adherence Tracking
      ↓
Outcome Measurement
```

Critical actions such as medication changes and care-plan approval require provider authorization in the prototype workflow.

---

# 🖥️ Master Application Screens

The integrated application contains the following major workflows:

### 1. Home Page

* Project introduction
* Animated hero section
* Navigation
* Login/signup access
* Session-aware CTAs

### 2. Authentication

* Sign up
* Login
* Logout
* Remember-me option
* Demo account access
* Session handling

### 3. Dashboard

The dashboard includes:

* Logged-in user greeting
* KPI cards
* Risk distribution
* Coverage statistics
* Volume statistics
* 7-day activity
* Care journey meters
* High-risk patient table

### 4. Patients

* Patient listing
* Search
* Patient filtering
* Patient profile access

### 5. Patient 360

A multi-tab patient view combining healthcare information into one workflow.

### 6. Digital Twin

* Patient digital twin
* Body representation
* Health information
* Risk information

### 7. Risk Prediction

* Current risk
* Risk trend
* Risk history
* SHAP-style explanation
* Contributing factors
* Confidence information

### 8. Care Plans

* Active plans
* Goals
* Interventions
* Progress
* Adherence
* Provider approval
* PDF download

### 9. Alerts

* Alert list
* Severity filters
* Critical-only toggle
* Alert acknowledgment

### 10. Monitoring

* Real-time vital information
* Patient/device monitoring
* Monitoring status
* Alert events

### 11. Reports

* Healthcare reports
* CSV export

### 12. Settings

Appearance preferences include:

* Light theme
* Dark theme
* System theme
* Accent color presets
* Custom accent color
* Compact sidebar
* Reduced motion
* Dense tables
* Tooltips
* Monitoring toggle
* Notifications toggle

Preferences are persisted using `localStorage` and applied through the application's appearance service.

---

# 🔐 Security & Access Control

The project implements a prototype security and audit architecture.

### Security Features

* JWT authentication
* Role-based access control
* Provider/patient access restrictions
* Consent verification
* Audit logging
* Protected API endpoints
* Session management
* CORS configuration
* Environment-based configuration

The project is **not HIPAA certified**.

Production deployment would require:

* Security hardening
* Privacy controls
* Encryption
* Clinical validation
* Legal review
* Regulatory assessment
* Infrastructure security
* Appropriate access controls
* Production-grade audit mechanisms

---

# 📋 FHIR Support

The project uses **FHIR R4** concepts for healthcare interoperability.

Supported resource workflows include:

```text
Patient
Condition
Observation
MedicationRequest
```

FHIR-related functionality includes:

* Resource creation
* Resource retrieval
* Validation
* JSON-to-FHIR mapping
* FHIR API integration
* Resource storage
* Patient-linked resources

FHIR resources are treated as synthetic demo healthcare data.

---

# 🧠 AI / ML Architecture

The project contains an `ai/` module for AI-related functionality.

```text
ai/
├── FastAPI prediction service
└── Federated-learning architecture notes
```

AI behavior in the current prototype is simulated where production ML models are unavailable.

The UI clearly communicates that predictions are demonstration outputs.

---

# 🧪 Testing

## Backend Unit Tests

```bash
cd backend
mvn test
```

Expected verification:

```text
15/15 tests pass
BUILD SUCCESS
```

---

## Frontend Unit Tests

```bash
cd frontend
npx ng test --browsers=ChromeHeadless --watch=false
```

Expected verification:

```text
2/2 tests pass
```

---

## Production Build

```bash
cd frontend
npx ng build
```

The verified build completes without compilation errors.

The initial bundle is approximately:

```text
660.60 kB
```

This is above the configured 500 kB budget warning but does not prevent the build from completing.

---

# 🔍 End-to-End API Smoke Test

Start the backend on port `8081`, then run:

```powershell
powershell -ExecutionPolicy Bypass -File infrastructure/e2e-smoke.ps1
```

The smoke suite covers:

* Login
* Seed counts
* Risk prediction
* Care plans
* Alerts
* FHIR
* RBAC
* Role restrictions
* Authentication
* Protected endpoints

Last recorded verification:

```text
72/72 tests passed
0 failures
```

---

# 🩺 Health Check

The application provides an unauthenticated health endpoint:

```http
GET /api/health
```

Expected response:

```json
{
  "status": "UP",
  "database": "CONNECTED"
}
```

---

# 🔒 Authentication Verification

Protected endpoints reject unauthenticated requests.

For example:

```http
GET /api/reports/export
```

Expected response:

```text
401 Unauthorized
```

---

# 📊 Verified Seed Census

The last recorded verification contains approximately:

```text
50 patients
152 alerts
36 care plans
50 digital twins
50 predictions
100 consents
50 devices
97 audit events
```

Seed version:

```text
demo-seed-v3
```

---

# 📁 Repository Structure

```text
Medisphere-Cognitive-Twin/
│
├── frontend/
│   └── Angular 20 SPA
│
├── backend/
│   └── Spring Boot 4 REST API
│       ├── JWT authentication
│       ├── MongoDB integration
│       ├── Kafka integration
│       └── Synthetic seed data
│
├── ai/
│   ├── FastAPI prediction service
│   └── Federated-learning architecture notes
│
├── infrastructure/
│   ├── Kubernetes manifests
│   └── e2e-smoke.ps1
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── SECURITY.md
│   ├── FHIR.md
│   ├── AI_ML.md
│   ├── DEPLOYMENT.md
│   └── DEMO.md
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

# 📚 Documentation

Additional project documentation is available in:

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

# ⚠️ Limitations & Disclaimer

MediSphere Cognitive Twin is a **prototype/demo healthcare application**.

All patient information is synthetic.

AI predictions, anomaly detection, risk models, and care-plan generation are simulated where production models are unavailable.

This project:

* Is not HIPAA certified
* Is not a medical device
* Does not provide medical advice
* Must not be used for real clinical decision-making
* Must not be deployed with real patient information without appropriate security and compliance controls

Production deployment would require comprehensive:

* Security assessment
* Privacy assessment
* Clinical validation
* Regulatory review
* Legal review
* Infrastructure hardening
* Data-protection controls
* Access-control implementation
* Audit and compliance processes

Provider approval is required for critical clinical actions in the prototype workflow.

---

# 🎯 Project Objective

The main objective of MediSphere Cognitive Twin is to demonstrate how **digital twin technology, healthcare interoperability, AI-assisted risk prediction, real-time monitoring, and preventive care workflows** can be integrated into a single healthcare management platform.

The project follows the four milestone progression:

```text
Milestone 1
FHIR + Digital Twin
        ↓
Milestone 2
AI Risk Prediction
        ↓
Milestone 3
Monitoring + Alerts
        ↓
Milestone 4
Care Plans + Intervention
        ↓
Integrated Healthcare Platform
```

---

# 👩‍💻 Project Status

**MediSphere Cognitive Twin — Integrated Prototype**

```text
Frontend              ✅ Angular 20
Backend               ✅ Spring Boot 4
Database              ✅ MongoDB
Messaging             ✅ Kafka / Simulation Mode
FHIR                  ✅ FHIR R4 workflows
Authentication        ✅ JWT
RBAC                  ✅ Implemented
Digital Twin          ✅ Implemented
Risk Prediction       ✅ Simulated
SHAP Explainability   ✅ Demonstration workflow
Monitoring            ✅ Implemented
Alerts                ✅ Implemented
Care Plans            ✅ Implemented
Provider Approval     ✅ Implemented
Reports               ✅ Implemented
Audit Trail           ✅ Implemented
Settings              ✅ Implemented
Docker                ✅ Supported
Kubernetes            ✅ Infrastructure manifests
Synthetic Data        ✅ Enabled
```

---

## 📌 Final Note

MediSphere Cognitive Twin demonstrates an end-to-end healthcare platform architecture connecting patient data ingestion, FHIR interoperability, digital twins, AI-assisted risk prediction, continuous monitoring, alerts, and provider-approved care planning.

**All data and AI outputs are synthetic/demo content and should not be interpreted as real medical information or medical advice.**
