# MediSphere Cognitive Twin 🏥

## AI Health Prediction & Digital Twin Platform

**MediSphere Cognitive Twin** is a full-stack healthcare management platform that combines **FHIR interoperability, digital patient twins, AI-assisted health-risk prediction, real-time monitoring, clinical alerts, and personalized care plans**.

The project is developed across **four milestones**, where each milestone adds a major component to the overall healthcare workflow.

> **Disclaimer:** All patient data used in this project is synthetic. AI predictions, monitoring results, anomaly detection, and care-plan generation are simulated/demo functionality. This project is a prototype, is **not HIPAA certified**, and does not provide medical advice.

---

## 🚀 Project Overview

MediSphere Cognitive Twin creates a digital representation of a patient's health information and connects healthcare data with AI-assisted decision-support workflows.

The platform integrates:

* FHIR R4 healthcare interoperability
* Digital patient twins
* AI-assisted risk prediction
* Simulated federated-learning architecture
* Real-time vital monitoring
* Clinical alerts and notifications
* Personalized care plans
* Provider review and approval
* Consent management
* Role-based access control
* Audit logging
* Healthcare reports

The complete platform follows this workflow:

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
MongoDB
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
Intervention & Outcome Tracking
```

---

# 🏗️ Technology Stack

| Component            | Technology                |
| -------------------- | ------------------------- |
| Frontend             | Angular 20                |
| Backend              | Spring Boot 4             |
| Programming Language | Java 25                   |
| Database             | MongoDB                   |
| Messaging            | Apache Kafka              |
| Healthcare Standard  | FHIR R4                   |
| Authentication       | JWT                       |
| AI/ML                | Simulated Risk Prediction |
| Explainability       | SHAP-style explanations   |
| AI Service           | FastAPI                   |
| Containerization     | Docker                    |
| Infrastructure       | Kubernetes                |
| Data                 | Synthetic Healthcare Data |

---

# 🔄 Four-Milestone Architecture

```text
Milestone 1
FHIR Integration + Digital Twin
          ↓
Milestone 2
AI Risk Prediction
          ↓
Milestone 3
Real-Time Monitoring + Alerts
          ↓
Milestone 4
Care Plans + Preventive Intervention
          ↓
Integrated Healthcare Platform
```

---

# 📌 Milestone 1 — FHIR Integration & Digital Twin Foundation

Milestone 1 establishes the healthcare data foundation and digital patient twin.

### Key Features

* FHIR R4 API integration
* Patient resource management
* Condition resources
* Observation resources
* MedicationRequest resources
* JSON-to-FHIR mapping
* FHIR resource validation
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
 Patient 360 Dashboard
```

### Patient 360

The Patient 360 workflow provides a consolidated view of:

* Patient demographics
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

---

# 🤖 Milestone 2 — Federated Learning & AI Risk Prediction

Milestone 2 introduces AI-assisted health-risk prediction.

The architecture demonstrates the concept of privacy-preserving federated learning, where healthcare environments can contribute to model-learning workflows without directly sharing raw patient information.

### Key Features

* Cardiovascular risk prediction
* Diabetes complication prediction
* Simulated federated learning
* Risk prediction history
* Model versioning
* Prediction confidence
* SHAP-style explainability
* Risk-factor visualization
* Clinical evidence display
* Provider review

### Workflow

```text
Patient / Digital Twin Data
          ↓
       AI Model
          ↓
    Risk Prediction
          ↓
 Confidence + Explanation
          ↓
     Provider Review
```

AI outputs are simulated/demo results and are not intended for clinical decision-making.

---

# 📡 Milestone 3 — Continuous Monitoring & Clinical Alerts

Milestone 3 introduces real-time patient monitoring and alert management.

Vital readings from connected devices can be processed through Kafka and evaluated using monitoring and clinical-rule workflows.

### Key Features

* Real-time vital monitoring
* Wearable/device data
* Kafka event streaming
* Anomaly detection simulation
* Clinical rule engine
* Alert generation
* Critical-alert filtering
* Provider notifications
* Alert acknowledgment
* Provider routing
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
Anomaly / Rule Detection
       ↓
      Alert
       ↓
Provider Notification
       ↓
Acknowledgment
```

---

# 🧑‍⚕️ Milestone 4 — AI Care Plans & Preventive Intervention

Milestone 4 connects risk predictions and monitoring results with personalized preventive-care planning.

The care-plan generator is simulated and requires provider review before critical actions.

### Key Features

* AI-assisted care-plan generation
* Personalized health goals
* Intervention tracking
* Adherence tracking
* Outcome measurement
* Provider collaboration
* Provider approval workflow
* Care-plan progress tracking
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
Adherence Tracking
      ↓
Outcome Measurement
```

Critical actions such as medication changes and care-plan approval require provider authorization in the prototype workflow.

---

# 🖥️ Main Application Modules

The integrated application contains:

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

# 🏠 Application Features

## Home

* Project introduction
* Animated hero section
* Navigation
* Login/signup access
* Session-aware actions

## Authentication

* User registration
* Login
* Logout
* Remember-me option
* Demo accounts
* Session handling
* JWT authentication

## Dashboard

* User greeting
* KPI cards
* Risk distribution
* Patient statistics
* Coverage statistics
* 7-day activity
* Care journey indicators
* High-risk patient table

## Patients

* Patient listing
* Search
* Filtering
* Patient profile access

## Patient 360

A consolidated patient workflow containing healthcare, risk, monitoring, FHIR, care-plan, and audit information.

## Digital Twin

* Patient digital twin
* Health information
* Vital information
* Risk information
* Patient status

## Risk Prediction

* Current risk
* Risk trend
* Risk history
* Risk factors
* SHAP-style explanations
* Confidence information

## Monitoring

* Real-time vital information
* Device monitoring
* Monitoring status
* Alert events

## Alerts

* Alert list
* Severity filtering
* Critical-only filtering
* Alert acknowledgment
* Provider notifications

## Care Plans

* Active care plans
* Goals
* Interventions
* Progress
* Adherence
* Provider approval
* PDF download

## Reports

* Healthcare reports
* CSV export

## Settings

Appearance and application preferences include:

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

Preferences are persisted using `localStorage`.

---

# 🔒 Security & Privacy

The project demonstrates a prototype security and audit architecture.

### Security Features

* JWT authentication
* Role-based access control
* Provider/patient access restrictions
* Consent management
* Audit logging
* Protected API endpoints
* Session management
* Environment-based CORS configuration

> This application is **not HIPAA certified**.

Production deployment would require appropriate:

* Security hardening
* Encryption
* Privacy controls
* Clinical validation
* Legal review
* Regulatory assessment
* Infrastructure security
* Access controls
* Production-grade auditing

---

# 📋 FHIR Support

The platform uses **FHIR R4** concepts for healthcare interoperability.

Supported resource workflows include:

```text
Patient
Condition
Observation
MedicationRequest
```

FHIR functionality includes:

* Resource creation
* Resource retrieval
* Resource validation
* JSON-to-FHIR mapping
* FHIR API integration
* Resource storage
* Patient-linked resources
* Status and error handling

All FHIR data used in the demo is synthetic.

---

# 🧠 AI / ML Architecture

The project contains an `ai/` module for AI-related functionality.

```text
ai/
├── FastAPI prediction service
└── Federated-learning architecture notes
```

The architecture demonstrates:

* Risk prediction
* Federated-learning concepts
* Model versioning
* Prediction confidence
* SHAP-style explainability

Where production ML models are unavailable, the current prototype uses simulated/demo behavior.

---

# 🧪 Synthetic Demo Data

All healthcare information in this project is **fictional and synthetic**.

The backend supports an idempotent synthetic dataset using:

```text
demo-seed-v3
```

A `seed_markers` collection tracks the seed version.

If a seed operation is interrupted, the next application startup can detect the incomplete operation and repair the demo collections.

Existing user accounts are preserved.

### Seeded Dataset

The demo dataset includes:

* 50 patients
* High-, medium-, and low-risk profiles
* Hypertension profiles
* Diabetes profiles
* Cardiovascular profiles
* Healthy profiles
* 7 doctors/providers
* 50 digital twins
* 3,500 vital readings
* 14 days of vital data
* 5 vital types per patient
* 500 laboratory results
* Risk-prediction history
* 35+ care plans
* 150+ alerts
* 350+ FHIR resources
* 100 consents
* Devices
* AI/ML model information
* Notifications
* Audit events

Disable synthetic seeding with:

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

---

# 🐳 Quick Start — Docker

## 1. Clone the Repository

```bash
git clone <your-repository-url>
cd Medisphere-Cognitive-Twin
```

## 2. Create Environment File

```bash
cp .env.example .env
```

## 3. Start the Application

```bash
docker compose up --build
```

## 4. Open the Application

Frontend:

```text
http://localhost:4200
```

Backend:

```text
http://localhost:8080
```

MongoDB and Kafka are included in the Docker Compose stack.

---

# 💻 Local Development

Docker can be used only for infrastructure while Angular and Spring Boot run locally.

### Start MongoDB and Kafka

```bash
docker compose up -d mongodb kafka
```

### Start Backend

```bash
cd backend
mvn spring-boot:run
```

Development backend:

```text
http://localhost:8081
```

### Start Frontend

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

# 🌐 Development Ports

| Service       |     Port | Description                 |
| ------------- | -------: | --------------------------- |
| Angular       |   `4300` | Development frontend        |
| Spring Boot   |   `8081` | Development backend         |
| Angular Proxy | `/api/*` | Proxies requests to backend |
| MongoDB       |  `27017` | Database                    |
| Kafka         |   `9092` | Event streaming             |

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

# 🔌 CORS Configuration

CORS is environment-driven.

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

## Frontend Unit Tests

```bash
cd frontend
npx ng test --browsers=ChromeHeadless --watch=false
```

Expected verification:

```text
2/2 tests pass
```

## Production Build

```bash
cd frontend
npx ng build
```

The recorded build completed without compilation errors.

The initial bundle was approximately:

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

# 🔐 Authentication Verification

Protected endpoints reject unauthenticated requests.

Example:

```http
GET /api/reports/export
```

Expected response:

```text
401 Unauthorized
```

---

# 📊 Verified Seed Census

Last recorded verification:

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

Additional documentation is available in:

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

# 🎯 Project Goal

MediSphere Cognitive Twin demonstrates an end-to-end healthcare platform by connecting:

```text
FHIR
  ↓
Digital Patient Twin
  ↓
AI Risk Prediction
  ↓
Real-Time Monitoring
  ↓
Clinical Alerts
  ↓
Personalized Care Plans
  ↓
Provider Approval
  ↓
Continuous Monitoring
```

The goal is to demonstrate how modern technologies can work together to support:

* Preventive healthcare
* Continuous patient monitoring
* Healthcare interoperability
* Digital twin technology
* AI-assisted risk assessment
* Clinical decision-support workflows
* Personalized care planning

---

# ⚠️ Limitations & Disclaimer

MediSphere Cognitive Twin is a **prototype/demo healthcare application**.

All patient information is synthetic.

AI predictions, anomaly detection, risk models, federated-learning behavior, and care-plan generation are simulated where production models are unavailable.

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

# 📈 Project Status

## MediSphere Cognitive Twin — Integrated Prototype

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

# 👩‍💻 Final Note

**MediSphere Cognitive Twin** demonstrates an integrated healthcare platform architecture connecting patient data ingestion, FHIR interoperability, digital patient twins, AI-assisted risk prediction, continuous monitoring, clinical alerts, and provider-approved care planning.

The four milestones collectively demonstrate the progression from **healthcare data integration → digital twins → AI risk prediction → real-time monitoring → preventive intervention**.

> **All data and AI outputs are synthetic/demo content and should not be interpreted as real medical information or medical advice.**
