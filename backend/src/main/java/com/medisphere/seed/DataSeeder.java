package com.medisphere.seed;

import com.medisphere.alerts.Alert;
import com.medisphere.alerts.AlertRepository;
import com.medisphere.auth.Role;
import com.medisphere.auth.User;
import com.medisphere.auth.UserRepository;
import com.medisphere.careplan.CarePlan;
import com.medisphere.careplan.CarePlanRepository;
import com.medisphere.consent.Consent;
import com.medisphere.consent.ConsentRepository;
import com.medisphere.federated.FlModel;
import com.medisphere.federated.FlModelRepository;
import com.medisphere.fhir.FhirResourceEntity;
import com.medisphere.fhir.FhirResourceRepository;
import com.medisphere.healthtwin.HealthTwin;
import com.medisphere.healthtwin.HealthTwinRepository;
import com.medisphere.labs.LabResult;
import com.medisphere.labs.LabResultRepository;
import com.medisphere.monitoring.Device;
import com.medisphere.monitoring.DeviceRepository;
import com.medisphere.notification.Notification;
import com.medisphere.notification.NotificationRepository;
import com.medisphere.audit.AuditLog;
import com.medisphere.audit.AuditLogRepository;
import com.medisphere.patient.Patient;
import com.medisphere.patient.PatientRepository;
import com.medisphere.provider.Provider;
import com.medisphere.provider.ProviderRepository;
import com.medisphere.risk.RiskPrediction;
import com.medisphere.risk.RiskPredictionRepository;
import com.medisphere.risk.RiskPredictionService;
import com.medisphere.vitals.VitalReading;
import com.medisphere.vitals.VitalReadingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.BulkOperations;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Idempotent demo dataset ("demo-seed-v7").
 *
 * <p>Seeds users, providers, 50 synthetic patients with digital twins,
 * 14 days of vitals history, 10 lab panels per patient, conditions,
 * medications, FHIR resources, devices, consents, deterministic risk
 * predictions, care plans, alerts, notifications and audit events.</p>
 *
 * <p>All data is entirely synthetic. Safe to run repeatedly: it checks
 * the seed-marker collection and never duplicates seeded records.</p>
 */
@Component
public class DataSeeder implements CommandLineRunner {
    private static final String SEED_VERSION = "demo-seed-v7";

    /** Device catalogue: type, display name, model, primary vital metric. */
    private static final String[][] DEVICE_CATALOG = {
            {"WEARABLE_WATCH", "Smartwatch", "MediSense Watch S2", "HEART_RATE"},
            {"FITNESS_TRACKER", "Fitness tracker", "MediSense Band Lite", "STEPS"},
            {"BP_CUFF", "Blood pressure monitor", "MediSense BP-7", "BLOOD_PRESSURE"},
            {"PULSE_OXIMETER", "Pulse oximeter", "MediSense Oxy-3", "SPO2"},
            {"GLUCOSE_MONITOR", "Glucose monitor", "MediSense Gluco-5", "GLUCOSE"},
    };

    /** Demo accounts: {displayName, email, password (first creation), specialty}. */
    private static final String[][] DEMO_USERS = {
            {"Dr. Sarah Khan", "admin@medisphere.demo", "Admin@12345", "Cardiology"},
            {"Alicia Reynolds", "admin2@medisphere.demo", "Admin@12345", ""},
            {"Dr. Maya Chen", "provider@medisphere.demo", "Provider@123", "Cardiology"},
            {"Dr. James Okafor", "provider2@medisphere.demo", "Provider@123", "Endocrinology"},
            {"Chris CareManager", "caremanager@medisphere.demo", "Care@12345", ""},
            {"Aiden Alvarez", "patient@medisphere.demo", "Patient@123", ""}
    };

    private final boolean enabled;
    private final UserRepository userRepository;
    private final ProviderRepository providerRepository;
    private final PatientRepository patientRepository;
    private final HealthTwinRepository healthTwinRepository;
    private final VitalReadingRepository vitalReadingRepository;
    private final LabResultRepository labResultRepository;
    private final RiskPredictionRepository riskPredictionRepository;
    private final RiskPredictionService riskPredictionService;
    private final AlertRepository alertRepository;
    private final CarePlanRepository carePlanRepository;
    private final FhirResourceRepository fhirResourceRepository;
    private final ConsentRepository consentRepository;
    private final FlModelRepository flModelRepository;
    private final DeviceRepository deviceRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final MongoTemplate mongoTemplate;
    private final PasswordEncoder passwordEncoder;
    private final Random random = new Random(42);

    public DataSeeder(@Value("${medisphere.seed.enabled}") boolean enabled, UserRepository userRepository,
                      ProviderRepository providerRepository, PatientRepository patientRepository,
                      HealthTwinRepository healthTwinRepository, VitalReadingRepository vitalReadingRepository,
                      LabResultRepository labResultRepository, RiskPredictionRepository riskPredictionRepository,
                      RiskPredictionService riskPredictionService, AlertRepository alertRepository,
                      CarePlanRepository carePlanRepository, FhirResourceRepository fhirResourceRepository,
                      ConsentRepository consentRepository, FlModelRepository flModelRepository,
                      DeviceRepository deviceRepository, NotificationRepository notificationRepository,
                      AuditLogRepository auditLogRepository, MongoTemplate mongoTemplate,
                      PasswordEncoder passwordEncoder) {
        this.enabled = enabled;
        this.userRepository = userRepository;
        this.providerRepository = providerRepository;
        this.patientRepository = patientRepository;
        this.healthTwinRepository = healthTwinRepository;
        this.vitalReadingRepository = vitalReadingRepository;
        this.labResultRepository = labResultRepository;
        this.riskPredictionRepository = riskPredictionRepository;
        this.riskPredictionService = riskPredictionService;
        this.alertRepository = alertRepository;
        this.carePlanRepository = carePlanRepository;
        this.fhirResourceRepository = fhirResourceRepository;
        this.consentRepository = consentRepository;
        this.flModelRepository = flModelRepository;
        this.deviceRepository = deviceRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
        this.mongoTemplate = mongoTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!enabled) return;

        // User records are repaired even when the clinical dataset is already seeded,
        // so account display names/roles stay consistent with the demo dataset.
        repairUsers();
        if (isSeeded()) return;

        // --- Idempotent recovery: if a previous seed run was interrupted before the
        // marker was written, clear partial demo clinical data (users are preserved)
        // so this run starts clean instead of creating duplicates. ---
        if (patientRepository.count() > 0) {
            for (Class<?> entity : List.of(HealthTwin.class, VitalReading.class, LabResult.class, Device.class,
                    Consent.class, FhirResourceEntity.class, RiskPrediction.class, CarePlan.class, Alert.class,
                    Notification.class, AuditLog.class, FlModel.class, Provider.class, Patient.class)) {
                mongoTemplate.remove(new Query(), mongoTemplate.getCollectionName(entity));
            }
        }

        // --- Repair: remove duplicate user accounts created by interrupted runs ---
        java.util.Set<String> seenEmails = new java.util.HashSet<>();
        for (User u : userRepository.findAll()) {
            String key = u.getEmail() == null ? u.getId() : u.getEmail().toLowerCase();
            if (!seenEmails.add(key)) userRepository.delete(u);
        }

        // --- Users ---
        createUser(DEMO_USERS[0][0], DEMO_USERS[0][1], DEMO_USERS[0][2], Role.SUPER_ADMIN, DEMO_USERS[0][3]);
        createUser(DEMO_USERS[1][0], DEMO_USERS[1][1], DEMO_USERS[1][2], Role.ADMIN, DEMO_USERS[1][3]);
        createUser(DEMO_USERS[2][0], DEMO_USERS[2][1], DEMO_USERS[2][2], Role.PROVIDER, DEMO_USERS[2][3]);
        createUser(DEMO_USERS[3][0], DEMO_USERS[3][1], DEMO_USERS[3][2], Role.PROVIDER, DEMO_USERS[3][3]);
        createUser(DEMO_USERS[4][0], DEMO_USERS[4][1], DEMO_USERS[4][2], Role.CARE_MANAGER, DEMO_USERS[4][3]);

        // --- Providers ---
        List<Provider> providers = new ArrayList<>();
        for (String[] p : new String[][]{
                {"Dr. Sarah Khan", "Cardiology"}, {"Dr. Maya Chen", "Cardiology"},
                {"Dr. James Okafor", "Endocrinology"}, {"Dr. Elena Ruiz", "Family Medicine"},
                {"Dr. Samuel Patel", "Internal Medicine"}, {"Dr. Nora Lindqvist", "Pediatrics"},
                {"Dr. Victor Amara", "Nephrology"}, {"Dr. Priya Nair", "Preventive Medicine"}}) {
            Provider prov = new Provider();
            prov.setName(p[0]);
            prov.setSpecialty(p[1]);
            prov.setEmail(p[0].toLowerCase().replace("dr. ", "").replace(" ", ".") + "@clinic.demo");
            prov.setAssignedPatients(5 + random.nextInt(12));
            prov.setActiveAlerts(random.nextInt(8));
            prov.setCarePlans(2 + random.nextInt(6));
            prov.setPerformanceScore(Math.round((0.8 + random.nextDouble() * 0.19) * 100) / 100.0);
            providers.add(providerRepository.save(prov));
        }

        String[] firstNames = {"Aiden", "Beatrice", "Carlos", "Diana", "Ethan", "Farah", "George", "Hana", "Ivan",
                "Jasmine", "Kenji", "Laura", "Milo", "Nadia", "Omar", "Priya", "Quinn", "Rosa", "Samir", "Tara",
                "Umar", "Vera", "Wade", "Xenia", "Yusuf", "Zara", "Adam", "Bella", "Cyrus", "Daria", "Eli",
                "Fiona", "Gustavo", "Hazel", "Iris", "Jonas", "Kira", "Leon", "Mira", "Noah", "Olivia", "Paul",
                "Rhea", "Soren", "Tess", "Ulyana", "Viktor", "Willa", "Xander"};
        String[] lastNames = {"Alvarez", "Bennett", "Chowdhury", "Delgado", "Eriksson", "Fischer", "Garcia",
                "Haddad", "Ito", "Johnson", "Kowalski", "Lopez", "Meyer", "Nguyen", "Osei", "Petrov",
                "Qureshi", "Rossi", "Singh", "Tanaka", "Usman", "Vargas", "Weber", "Xiong", "Yilmaz", "Zhang"};
        String[] genders = {"MALE", "FEMALE", "OTHER"};

        List<Patient> patients = new ArrayList<>();
        List<HealthTwin> twins = new ArrayList<>();
        List<Device> devices = new ArrayList<>();
        List<Consent> consents = new ArrayList<>();
        List<FhirResourceEntity> fhirResources = new ArrayList<>();

        for (int i = 0; i < 50; i++) {
            int profile = i % 5; // 0=high, 1-2=medium, 3-4=low
            String firstName = firstNames[i % firstNames.length];
            String lastName = lastNames[i % lastNames.length];
            String fullName = firstName + " " + lastName;
            int dobYear = 1945 + ((i * 37) % 60);
            String dob = dobYear + "-" + String.format("%02d", 1 + (i * 7) % 12) + "-" + String.format("%02d", 1 + (i * 11) % 28);

            Patient p = new Patient();
            p.setFirstName(firstName);
            p.setLastName(lastName);
            p.setDateOfBirth(dob);
            p.setGender(genders[i % 3]);
            p.setEmail(fullName.toLowerCase().replace(" ", ".") + "@example.demo");
            p.setPhone("555-0" + (100 + i));
            p.setAddress((100 + i) + " Demo Street, Sample City");
            // Dr. Sarah Khan is the primary attending for the demo cohort; a minority of
            // patients are shared with the rest of the panel so multi-doctor views work.
            int panelIndex = (i % 5 == 0) ? (1 + (i / 5) % (providers.size() - 1)) : 0;
            p.setProviderId(providers.get(panelIndex).getId());
            p.setProviderName(providers.get(panelIndex).getName());
            p.setConsentStatus("GRANTED");
            p.setMedicalIdentifier("MRN-DEMO-" + (1000 + i));
            // registration dates spread across the last ~3 months so "new patient"
            // dashboard metrics are derived from real timestamps (not zeros)
            p.setCreatedAt(Instant.now().minus(3 + (i * 11) % 87, ChronoUnit.DAYS));
            p.setUpdatedAt(Instant.now().minus(i, ChronoUnit.HOURS));
            patients.add(patientRepository.save(p));

            // --- Devices (saved before vitals so every reading references a real device) ---
            Device[] myDevices = new Device[DEVICE_CATALOG.length];
            for (int d = 0; d < DEVICE_CATALOG.length; d++) {
                myDevices[d] = deviceRepository.save(deviceFor(p, fullName, i, d));
                devices.add(myDevices[d]);
            }

            // --- Digital twin ---
            boolean smoker = i % 7 == 0;
            double bmi = Math.round((21 + (i * 3) % 14 + random.nextDouble()) * 10) / 10.0;
            List<String> conditions = new ArrayList<>();
            List<String> medications = new ArrayList<>();
            if (profile == 0) {
                conditions.add("Type 2 diabetes");
                conditions.add("Hypertension");
                conditions.add("Hyperlipidemia");
                medications.add("Metformin 500mg");
                medications.add("Lisinopril 10mg");
            } else if (profile == 1 || profile == 2) {
                conditions.add("Hypertension");
                conditions.add("Hyperlipidemia");
                if (profile == 2) conditions.add("Obesity");
                medications.add("Atorvastatin 20mg");
            } else {
                conditions.add("Routine screening");
            }

            // --- Vitals history (14 days x 5 types) ---
            double baseHr = 62 + (i * 5) % 30;
            double baseSbp = profile == 0 ? 138 + (i % 20) : profile == 3 || profile == 4 ? 112 + (i % 12) : 124 + (i % 14);
            double baseSpo2 = 95 + (i % 4);
            double baseGlucose = profile == 0 ? 140 + (i % 60) : 85 + (i % 30);
            double baseSteps = 2500 + (i * 137) % 7000;
            BulkOperations vitalsBulk = mongoTemplate.bulkOps(BulkOperations.BulkMode.UNORDERED, VitalReading.class);
            for (int d = 14; d >= 0; d--) {
                for (String type : new String[]{"HEART_RATE", "BLOOD_PRESSURE", "SPO2", "GLUCOSE", "STEPS", "TEMPERATURE", "RESP_RATE"}) {
                    int deviceIndex = deviceIndexFor(type);
                    // Devices that stopped reporting must not receive fresh readings,
                    // so dashboard connectivity status stays derived from real timestamps.
                    int silenceH = silentHours(i, deviceIndex);
                    if (d < silenceH / 24) continue;
                    VitalReading v = new VitalReading();
                    v.setPatientId(p.getId());
                    v.setType(type);
                    v.setDeviceId(myDevices[deviceIndex].getId());
                    v.setTimestamp(Instant.now().minus(d, ChronoUnit.DAYS)
                            .minus(silenceH % 24, ChronoUnit.HOURS));
                    switch (type) {
                        case "HEART_RATE" -> { v.setValue(Math.round(baseHr + random.nextInt(14) - 7)); v.setUnit("bpm"); }
                        case "BLOOD_PRESSURE" -> { v.setValue(Math.round(baseSbp + random.nextInt(10) - 5)); v.setUnit("mmHg"); }
                        case "SPO2" -> { v.setValue(Math.round(baseSpo2)); v.setUnit("%"); }
                        case "GLUCOSE" -> { v.setValue(Math.round(baseGlucose + random.nextInt(16) - 8)); v.setUnit("mg/dL"); }
                        case "STEPS" -> { v.setValue(Math.round(baseSteps + random.nextInt(1200) - 600)); v.setUnit("steps"); }
                    }
                    vitalsBulk.insert(v);
                }
            }
            vitalsBulk.execute();

            // --- Labs (10 panels) ---
            double hba1c = Math.round((profile == 0 ? 6.6 + random.nextDouble() * 1.6 : 5.2 + random.nextDouble() * 0.8) * 10) / 10.0;
            double cholesterol = Math.round((profile == 0 ? 215 + random.nextInt(40) : 165 + random.nextInt(35)) * 10) / 10.0;
            double ldl = Math.round((cholesterol - 40 - random.nextInt(25)) * 10) / 10.0;
            double hdl = Math.round((38 + random.nextInt(22)) * 10) / 10.0;
            double triglycerides = Math.round((profile == 0 ? 170 + random.nextInt(60) : 90 + random.nextInt(50)) * 10) / 10.0;
            double creatinine = Math.round((0.8 + random.nextDouble() * 0.5) * 100) / 100.0;
            double egfr = Math.round((60 + random.nextInt(40)) * 10) / 10.0;
            double alt = Math.round((18 + random.nextInt(22)) * 10) / 10.0;
            double ast = Math.round((16 + random.nextInt(20)) * 10) / 10.0;
            double fastingGlucose = Math.round((profile == 0 ? 118 + random.nextInt(30) : 82 + random.nextInt(16)) * 10) / 10.0;
            seedLabPanels(p.getId(), hba1c, fastingGlucose, cholesterol, ldl, hdl, triglycerides, creatinine, egfr, alt, ast);

            // --- Twin ---
            HealthTwin t = new HealthTwin();
            t.setPatientId(p.getId());
            t.setCompletenessScore(Math.round((0.72 + random.nextDouble() * 0.27) * 100) / 100.0);
            t.setStatus("ACTIVE");
            t.getBodyMetrics().put("bmi", bmi);
            t.getBodyMetrics().put("restingHeartRate", (int) baseHr);
            t.getBodyMetrics().put("smoker", smoker);
            t.getBodyMetrics().put("systolicBP", (int) baseSbp);
            t.getBodyMetrics().put("spo2", (int) baseSpo2);
            t.getRiskMap().put("cardiovascular", profile == 0 ? "HIGH" : profile == 1 || profile == 2 ? "MEDIUM" : "LOW");
            t.getRiskMap().put("diabetes", profile == 0 ? "HIGH" : profile == 2 ? "MEDIUM" : "LOW");
            t.getVitalSummaries().put("heartRate", Math.round(baseHr) + " bpm");
            t.getVitalSummaries().put("bloodPressure", Math.round(baseSbp) + " mmHg systolic");
            t.getVitalSummaries().put("oxygenSaturation", (int) baseSpo2 + "%");
            t.getVitalSummaries().put("glucose", Math.round(baseGlucose) + " mg/dL");
            t.getVitalSummaries().put("steps", Math.round(baseSteps) + "/day");
            t.getLabSummaries().put("HbA1c", hba1c + "%");
            t.getLabSummaries().put("Total Cholesterol", cholesterol + " mg/dL");
            t.getLabSummaries().put("Fasting Glucose", fastingGlucose + " mg/dL");
            t.setConditions(conditions);
            t.setMedications(medications);
            t.setRecentEvents(List.of("FHIR sync completed", "Vitals received from " + DEVICE_CATALOG[0][1], "Risk prediction generated"));
            t.setHealthTrends(List.of("Blood pressure stable over 14 days", "Activity within target range"));
            twins.add(t);

            // --- Consents ---
            for (String cat : new String[]{"DATA_SHARING", "AI_ANALYSIS"}) {
                Consent c = new Consent();
                c.setPatientId(p.getId());
                c.setPatientName(fullName);
                c.setCategory(cat);
                c.setStatus("GRANTED");
                c.setGrantedBy(p.getEmail());
                consents.add(c);
            }

            // --- FHIR resources (8 per patient) ---
            fhirResources.add(fhirPatientResource(p, fullName));
            for (String obs : new String[]{"Heart rate", "Blood pressure", "Oxygen saturation", "Glucose"}) {
                FhirResourceEntity o = new FhirResourceEntity();
                o.setResourceType("Observation");
                o.setResourceId("demo-obs-" + i + "-" + obs.hashCode());
                o.setPatientId(p.getId());
                o.setValidationStatus("VALID");
                o.setResource(Map.of("resourceType", "Observation", "id", "demo-obs-" + i,
                        "code", Map.of("text", obs), "status", "final",
                        "subject", Map.of("reference", "Patient/" + p.getId())));
                fhirResources.add(o);
            }
            FhirResourceEntity cond = new FhirResourceEntity();
            cond.setResourceType("Condition");
            cond.setResourceId("demo-cond-" + i);
            cond.setPatientId(p.getId());
            cond.setValidationStatus("VALID");
            cond.setResource(Map.of("resourceType", "Condition", "id", "demo-cond-" + i,
                    "code", Map.of("text", conditions.get(0)),
                    "subject", Map.of("reference", "Patient/" + p.getId()),
                    "clinicalStatus", Map.of("text", "active")));
            fhirResources.add(cond);
            FhirResourceEntity med = new FhirResourceEntity();
            med.setResourceType("MedicationRequest");
            med.setResourceId("demo-med-" + i);
            med.setPatientId(p.getId());
            med.setValidationStatus("VALID");
            med.setResource(Map.of("resourceType", "MedicationRequest", "id", "demo-med-" + i,
                    "status", "active",
                    "medicationCodeableConcept", Map.of("text", medications.isEmpty() ? "None (synthetic)" : medications.get(0)),
                    "subject", Map.of("reference", "Patient/" + p.getId())));
            fhirResources.add(med);
        }

        healthTwinRepository.saveAll(twins);
        deviceRepository.saveAll(devices);
        consentRepository.saveAll(consents);
        fhirResourceRepository.saveAll(fhirResources);

        // --- Deterministic risk predictions for every patient (with 7-day history) ---
        for (Patient p : patients) {
            riskPredictionService.generate(p.getId());
        }
        seedPredictionHistory(patients);

        // --- Care plans (35) — each one carries the patient's real assigned doctor ---
        for (int i = 0; i < 35; i++) {
            Patient p = patients.get(i);
            Instant assignedAt = Instant.now().minus(8 + i, ChronoUnit.DAYS);
            CarePlan cp = new CarePlan();
            cp.setPatientId(p.getId());
            cp.setPatientName(p.fullName());
            cp.setGoal("Improve cardiometabolic risk profile");
            cp.setStatus(i % 4 == 0 ? "AI_GENERATED" : i % 4 == 1 ? "ACTIVE" : i % 4 == 2 ? "PENDING_REVIEW" : "APPROVED");
            cp.setAdherenceScore(45 + (i * 7) % 50);
            cp.setProviderId(p.getProviderId());
            cp.setProviderName(p.getProviderName());
            cp.setCareManagerName("Chris CareManager");
            cp.setAssignedAt(assignedAt);
            cp.setGoals(List.of("Reduce overall risk score by 10% in 3 months",
                    i % 3 == 0 ? "Reduce average HbA1c by 0.5%" : "Achieve blood pressure below 130/80",
                    "Walk 30 minutes, 5 days per week"));
            cp.setInterventions(List.of("Weekly tele-check-in", "Home monitoring", "Monthly care manager review"));
            cp.setMedications(List.of("No automatic medication changes. Provider approval required."));
            cp.setLifestyle(List.of("DASH-style diet", "150 minutes exercise/week"));
            cp.setMonitoringSchedule("Daily BP/glucose; weekly weight; labs every 3 months");
            cp.setFollowUpSchedule("Provider follow-up in 4 weeks");
            cp.setAiReasoning("Reasoning based on the latest risk prediction, conditions and recent vitals.");
            cp.setGuidelineReferences("ADA Standards of Care (references); AHA/ACC guidelines (references)");
            cp.setCreatedAt(assignedAt);
            cp.setApprovals(new ArrayList<>(List.of(
                    new CarePlan.ApprovalEvent(p.getProviderName(), "AI_GENERATED", "Plan drafted from the patient's latest risk prediction.", assignedAt))));
            if (!"AI_GENERATED".equals(cp.getStatus())) {
                cp.getApprovals().add(new CarePlan.ApprovalEvent(p.getProviderName(), "REVIEWED",
                        "Goals and interventions reviewed against the current medication list.", assignedAt.plus(1, ChronoUnit.DAYS)));
            }
            if (List.of("ACTIVE", "APPROVED").contains(cp.getStatus())) {
                cp.getApprovals().add(new CarePlan.ApprovalEvent(p.getProviderName(), "APPROVED",
                        "Approved after chart review and patient discussion.", assignedAt.plus(2, ChronoUnit.DAYS)));
            }
            carePlanRepository.save(cp);
        }

        // --- Alerts (42) — every alert carries an owner and a clinical note so the
        // Note / Assigned columns in the alerts console are never blank. ---
        String[] alertTypes = {"TACHYCARDIA", "LOW_OXYGEN", "FEVER", "ELEVATED_GLUCOSE", "HYPERTENSION_RANGE", "BRADYCARDIA"};
        String[] alertStatuses = {"NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"};
        for (int i = 0; i < 42; i++) {
            Patient p = patients.get(i % patients.size());
            String type = alertTypes[i % alertTypes.length];
            Alert a = new Alert();
            a.setPatientId(p.getId());
            a.setPatientName(p.fullName());
            a.setType(type);
            a.setCategory(i % 4 == 0 ? "CRITICAL" : i % 3 == 0 ? "HIGH" : "MEDIUM");
            a.setVitalType(vitalTypeFor(type));
            a.setValue(95 + random.nextInt(45));
            a.setThreshold(100);
            a.setAiAnalysis("Rule-engine analysis based on the configured alert thresholds.");
            a.setConfidence(Math.round((0.7 + random.nextDouble() * 0.25) * 100) / 100.0);
            a.setStatus(alertStatuses[i % alertStatuses.length]);
            a.setAssignedProvider(p.getProviderName());
            a.setClinicalNote(clinicalNoteFor(type, p.getProviderName()));
            // Spread the alert history across the last 7 days so trend charts
            // are built from persisted timestamps rather than fabricated values.
            a.setCreatedAt(Instant.now().minus((long) i * 4, ChronoUnit.HOURS));
            alertRepository.save(a);
        }

        // --- Models ---
        FlModel m = new FlModel();
        m.setName("Cardiovascular Risk Federated Model");
        m.setVersion("cardio-fl-v1.4.2-demo");
        m.setType("Cardiovascular");
        m.setStatus("ACTIVE");
        m.setAccuracy(0.855);
        m.setTrainingDate("2026-08-12");
        m.setDatasetInfo("Federated demo cohort, synthetic records");
        m.setValidationResults("AUROC 0.86 (synthetic)");
        m.setFederatedRound(42);
        m.setLoss(0.34);
        flModelRepository.save(m);

        FlModel m2 = new FlModel();
        m2.setName("Diabetes Complication Federated Model");
        m2.setVersion("dm-fl-v0.9.1-demo");
        m2.setType("Diabetes");
        m2.setStatus("INACTIVE");
        m2.setAccuracy(0.83);
        m2.setTrainingDate("2026-07-30");
        m2.setDatasetInfo("Federated demo cohort, synthetic records");
        m2.setValidationResults("AUROC 0.82 (synthetic)");
        m2.setFederatedRound(28);
        m2.setLoss(0.41);
        flModelRepository.save(m2);

        // --- Patient demo user ---
        User patientUser = userRepository.findByEmail("patient@medisphere.demo").orElseGet(User::new);
        patientUser.setName("Aiden Alvarez");
        patientUser.setEmail("patient@medisphere.demo");
        if (patientUser.getPasswordHash() == null || patientUser.getPasswordHash().isBlank()) {
            patientUser.setPasswordHash(passwordEncoder.encode("Patient@123"));
        }
        patientUser.setRole(Role.PATIENT);
        patientUser.setPatientId(patients.get(0).getId());
        userRepository.save(patientUser);

        // --- Notifications ---
        notificationRepository.save(notification("Welcome to MediSphere", "Demo environment seeded with synthetic data.", "SYSTEM"));
        notificationRepository.save(notification("Care plan pending review", "1 care plan awaits provider approval.", "APPROVAL"));
        notificationRepository.save(notification("New risk predictions", "Deterministic demo predictions generated for 50 patients.", "RISK"));

        // --- Audit + seed marker ---
        seedAuditTrail();
        AuditLog log = new AuditLog();
        log.setUser("system");
        log.setRole("SYSTEM");
        log.setAction("SEED_DATA_LOADED");
        log.setResource("Database");
        log.setResult("SUCCESS");
        log.setDetails("Synthetic demo dataset v2 created: 50 patients, twins, vitals, labs, predictions, care plans, alerts, FHIR resources");
        log.setTimestamp(Instant.now());
        auditLogRepository.save(log);

        Map<String, Object> marker = new HashMap<>();
        marker.put("_id", SEED_VERSION);
        marker.put("appliedAt", Instant.now().toString());
        marker.put("patients", patients.size());
        mongoTemplate.save(marker, "seed_markers");
    }

    /**
     * Persists 3 back-dated predictions per patient so the prediction history table
     * and its trend graph are backed by stored records rather than chart-side fakes.
     * Values are deterministic offsets of the current simulated score.
     */
    private void seedPredictionHistory(List<Patient> patients) {
        int[] daysBack = {7, 4, 2};
        double[] offsets = {-3.4, -1.8, -0.6};
        for (Patient p : patients) {
            RiskPrediction latest = riskPredictionRepository.findFirstByPatientIdOrderByPredictedAtDesc(p.getId()).orElse(null);
            if (latest == null) continue;
            for (int k = 0; k < daysBack.length; k++) {
                RiskPrediction h = new RiskPrediction();
                h.setPatientId(p.getId());
                h.setPatientName(p.fullName());
                double score = Math.max(1.0, Math.round((latest.getOverallScore() + offsets[k]) * 10) / 10.0);
                h.setOverallScore(score);
                h.setCardiovascularRisk10y(Math.max(1.0, Math.round((latest.getCardiovascularRisk10y() + offsets[k] * 0.6) * 10) / 10.0));
                h.setDiabetesComplicationRisk(Math.max(1.0, Math.round((latest.getDiabetesComplicationRisk() + offsets[k] * 0.5) * 10) / 10.0));
                h.setRiskCategory(categoryFor(score));
                h.setTrend("STABLE");
                h.setConfidence(Math.max(0.5, latest.getConfidence() - (daysBack.length - k) * 0.02));
                h.setModelVersion(latest.getModelVersion());
                h.setEvidenceSummary(latest.getEvidenceSummary());
                h.setMethodology(latest.getMethodology());
                h.setContributions(latest.getContributions());
                h.setPredictedAt(Instant.now().minus(daysBack[k], ChronoUnit.DAYS));
                riskPredictionRepository.save(h);
            }
        }
    }

    private String categoryFor(double score) {
        return score < 8 ? "LOW" : score < 16 ? "MODERATE" : score < 28 ? "HIGH" : "VERY_HIGH";
    }

    /** Catalogue index of the device that reports the given vital type. */
    private int deviceIndexFor(String vitalType) {
        // Two metrics have no dedicated device in the catalogue; they are reported by
        // the smartwatch (skin temperature) and the pulse oximeter (respiratory rate),
        // matching the mapping used by the simulation service.
        if ("TEMPERATURE".equals(vitalType)) return 0;
        if ("RESP_RATE".equals(vitalType)) return 3;
        for (int i = 0; i < DEVICE_CATALOG.length; i++) {
            if (DEVICE_CATALOG[i][3].equals(vitalType)) return i;
        }
        return 0;
    }

    /**
     * Deterministic per-device silence window (in hours). Roughly one device in six
     * went quiet a few hours ago (idle) and one in twelve days ago (offline), so the
     * dashboard can show genuine online / idle / offline states derived from reading
     * timestamps rather than a stored flag.
     */
    private int silentHours(int patientIndex, int deviceIndex) {
        // Multiplicative mix keeps every device *type* represented in every bucket
        // (a plain linear sum would push all offline devices onto one product line).
        int bucket = Math.floorMod(patientIndex * 7 + deviceIndex * 5, 12);
        if (bucket == 0) return 96;  // 4 days  -> OFFLINE
        if (bucket == 5) return 18;  // 18 hours -> IDLE
        return 0;                    // reporting -> ONLINE
    }

    /** Deterministic simulated wearable for a patient (no real hardware involved). */
    private Device deviceFor(Patient p, String fullName, int patientIndex, int deviceIndex) {
        String[] spec = DEVICE_CATALOG[deviceIndex];
        Device dev = new Device();
        dev.setPatientId(p.getId());
        dev.setPatientName(fullName);
        dev.setType(spec[0]);
        dev.setName(spec[1]);
        dev.setModelName(spec[2]);
        dev.setMetric(spec[3]);
        dev.setBatteryPercent(35 + ((patientIndex * 13 + deviceIndex * 29) % 64));
        dev.setSignal(55 + ((patientIndex * 7 + deviceIndex * 17) % 45));
        dev.setFirmware("v" + (1 + deviceIndex % 3) + "." + (patientIndex % 9) + "." + (deviceIndex % 5));
        int silentH = silentHours(patientIndex, deviceIndex);
        dev.setLastSeen(Instant.now().minus(silentH, ChronoUnit.HOURS).toString());
        dev.setStatus(silentH <= 6 ? "ONLINE" : silentH <= 48 ? "IDLE" : "OFFLINE");
        return dev;
    }

    /** Realistic audit trail spread over the last 7 days (used by the activity feed). */
    private void seedAuditTrail() {
        String[][] template = {
                {"LOGIN_SUCCESS", "User", "SUCCESS", "Interactive sign-in"},
                {"PATIENT_VIEWED", "Patient", "SUCCESS", "Patient 360 opened"},
                {"RISK_PREDICTION_GENERATED", "RiskPrediction", "SUCCESS", "Deterministic demo model scored the patient"},
                {"CARE_PLAN_APPROVED", "CarePlan", "SUCCESS", "Doctor approved the care plan"},
                {"ALERT_ACKNOWLEDGED", "Alert", "SUCCESS", "Alert triaged by care team"},
                {"CONSENT_CHANGED", "Consent", "SUCCESS", "Patient consent updated"},
                {"REPORT_DOWNLOADED", "Report", "SUCCESS", "CSV export generated"},
                {"SETTINGS_THRESHOLDS_UPDATED", "Settings", "SUCCESS", "Alert thresholds updated"},
                {"FHIR_RESOURCE_IMPORTED", "FhirResource", "SUCCESS", "FHIR R4 resource validated on import"},
                {"LOGIN_FAILED", "User", "FAILURE", "Invalid credentials (simulated)"}
        };
        String[] actors = {"admin@medisphere.demo", "provider@medisphere.demo", "caremanager@medisphere.demo", "admin2@medisphere.demo"};
        for (int i = 0; i < 40; i++) {
            String[] t = template[i % template.length];
            AuditLog log = new AuditLog();
            log.setUser(actors[i % actors.length]);
            log.setRole(i % 3 == 0 ? "ADMIN" : i % 3 == 1 ? "PROVIDER" : "CARE_MANAGER");
            log.setAction(t[0]);
            log.setResource(t[1]);
            log.setResourceId("demo-" + (i % 12));
            log.setResult(t[2]);
            log.setDetails(t[3]);
            log.setTimestamp(Instant.now().minus((long) i * 4, ChronoUnit.HOURS));
            auditLogRepository.save(log);
        }
    }

    private void seedLabPanels(String patientId, double hba1c, double fastingGlucose, double cholesterol,
                                  double ldl, double hdl, double triglycerides, double creatinine,
                                  double egfr, double alt, double ast) {
        Instant collected = Instant.now().minus(5, ChronoUnit.DAYS);
        addLab(patientId, "HbA1c", hba1c, "%", "4.0-5.6", hba1c > 6.4 ? "HIGH" : "NORMAL", collected);
        addLab(patientId, "Fasting Glucose", fastingGlucose, "mg/dL", "70-99", fastingGlucose > 99 ? "HIGH" : "NORMAL", collected);
        addLab(patientId, "Total Cholesterol", cholesterol, "mg/dL", "<200", cholesterol > 200 ? "HIGH" : "NORMAL", collected);
        addLab(patientId, "LDL Cholesterol", ldl, "mg/dL", "<100", ldl > 100 ? "HIGH" : "NORMAL", collected);
        addLab(patientId, "HDL Cholesterol", hdl, "mg/dL", ">40", hdl < 40 ? "LOW" : "NORMAL", collected);
        addLab(patientId, "Triglycerides", triglycerides, "mg/dL", "<150", triglycerides > 150 ? "HIGH" : "NORMAL", collected);
        addLab(patientId, "Creatinine", creatinine, "mg/dL", "0.7-1.2", creatinine > 1.2 ? "HIGH" : "NORMAL", collected);
        addLab(patientId, "eGFR", egfr, "mL/min", ">60", egfr < 60 ? "LOW" : "NORMAL", collected);
        addLab(patientId, "ALT", alt, "U/L", "7-40", alt > 40 ? "HIGH" : "NORMAL", collected);
        addLab(patientId, "AST", ast, "U/L", "8-40", ast > 40 ? "HIGH" : "NORMAL", collected);
    }

    private void addLab(String patientId, String test, double value, String unit, String range, String status, Instant collected) {
        LabResult lab = new LabResult();
        lab.setPatientId(patientId);
        lab.setTestName(test);
        lab.setValue(Math.round(value * 100) / 100.0);
        lab.setUnit(unit);
        lab.setReferenceRange(range);
        lab.setStatus(status);
        lab.setCollectedAt(collected);
        labResultRepository.save(lab);
    }

    private FhirResourceEntity fhirPatientResource(Patient p, String fullName) {
        FhirResourceEntity f = new FhirResourceEntity();
        f.setResourceType("Patient");
        f.setResourceId("demo-patient-" + p.getMedicalIdentifier());
        f.setPatientId(p.getId());
        f.setValidationStatus("VALID");
        f.setResource(Map.of("resourceType", "Patient", "id", "demo-patient-" + p.getMedicalIdentifier(),
                "name", List.of(Map.of("family", p.getLastName(), "given", List.of(p.getFirstName()))),
                "gender", p.getGender().toLowerCase(), "birthDate", p.getDateOfBirth(),
                "identifier", List.of(Map.of("system", "https://demo.medisphere.local/mrn", "value", p.getMedicalIdentifier()))));
        return f;
    }

    private Notification notification(String title, String message, String category) {
        Notification n = new Notification();
        n.setTitle(title);
        n.setMessage(message);
        n.setCategory(category);
        return notificationRepository.save(n);
    }

    /** Maps a seeded alert type onto the vital that triggered it. */
    private static String vitalTypeFor(String type) {
        return switch (type) {
            case "LOW_OXYGEN" -> "SPO2";
            case "FEVER" -> "TEMPERATURE";
            case "ELEVATED_GLUCOSE" -> "GLUCOSE";
            case "HYPERTENSION_RANGE", "BRADYCARDIA" -> "BLOOD_PRESSURE";
            default -> "HEART_RATE";
        };
    }

    /** Owner-facing triage note so the alerts console never renders an empty Note cell. */
    private static String clinicalNoteFor(String type, String doctor) {
        return switch (type) {
            case "LOW_OXYGEN" -> "Confirm pulse-oximeter fit and repeat the reading; escalate if SpO2 stays below threshold.";
            case "FEVER" -> "Review temperature trend and current medications; advise on next-step assessment.";
            case "ELEVATED_GLUCOSE" -> "Check glucose log against meal and medication timing; schedule a review call.";
            case "HYPERTENSION_RANGE" -> "Confirm home BP technique and capture a 7-day average before changing the plan.";
            case "BRADYCARDIA" -> "Verify resting measurement and review rate-limiting medication with the patient.";
            default -> "Confirm the sustained heart-rate elevation, review symptoms and the current care plan.";
        } + " Assigned to " + doctor + ".";
    }

    private boolean isSeeded() {
        return mongoTemplate.exists(Query.query(Criteria.where("_id").is(SEED_VERSION)), "seed_markers");
    }

    /**
     * Idempotent repair of the demo accounts: removes duplicate accounts created by
     * interrupted runs and keeps display names aligned with the seeded clinical data
     * (the header/profile UI always renders the authenticated user's own name).
     */
    private void repairUsers() {
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (User u : userRepository.findAll()) {
            String key = u.getEmail() == null ? u.getId() : u.getEmail().toLowerCase();
            if (!seen.add(key)) userRepository.delete(u);
        }
        for (String[] spec : DEMO_USERS) {
            userRepository.findByEmail(spec[1]).ifPresent(u -> {
                boolean changed = false;
                if (!spec[0].equals(u.getName())) {
                    u.setName(spec[0]);
                    changed = true;
                }
                String specialty = spec.length > 3 ? spec[3] : "";
                String wanted = (specialty == null || specialty.isBlank()) ? null : specialty;
                if (!java.util.Objects.equals(wanted, u.getSpecialty())) {
                    u.setSpecialty(wanted);
                    changed = true;
                }
                if (!u.isActive()) {
                    u.setActive(true);
                    changed = true;
                }
                if (changed) userRepository.save(u);
            });
        }
    }

    private void createUser(String name, String email, String password, Role role, String specialty) {
        if (userRepository.findByEmail(email).isPresent()) return;
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(password));
        u.setRole(role);
        u.setSpecialty(specialty);
        userRepository.save(u);
    }
}
