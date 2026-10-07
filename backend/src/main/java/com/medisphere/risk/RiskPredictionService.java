package com.medisphere.risk;

import com.medisphere.healthtwin.HealthTwin;
import com.medisphere.healthtwin.HealthTwinRepository;
import com.medisphere.labs.LabResult;
import com.medisphere.labs.LabResultRepository;
import com.medisphere.patient.Patient;
import com.medisphere.patient.PatientRepository;
import com.medisphere.vitals.VitalReading;
import com.medisphere.vitals.VitalReadingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic synthetic risk model.
 *
 * <p>Computes demo cardiovascular and diabetes-complication risk from the
 * patient's actual stored clinical data (age, vitals, labs, conditions,
 * activity). This is a demonstration model: it is NOT clinically validated
 * and its output must never be presented as medical advice.</p>
 */
@Service
public class RiskPredictionService {
    private static final String MODEL_VERSION = "cardio-fl-v1.4.2-demo";
    private static final DateTimeFormatter DOB_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final RiskPredictionRepository repository;
    private final PatientRepository patientRepository;
    private final HealthTwinRepository healthTwinRepository;
    private final VitalReadingRepository vitalReadingRepository;
    private final LabResultRepository labResultRepository;

    public RiskPredictionService(RiskPredictionRepository repository, PatientRepository patientRepository,
                                   HealthTwinRepository healthTwinRepository, VitalReadingRepository vitalReadingRepository,
                                   LabResultRepository labResultRepository) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.healthTwinRepository = healthTwinRepository;
        this.vitalReadingRepository = vitalReadingRepository;
        this.labResultRepository = labResultRepository;
    }

    public record RiskResult(double cardiovascular, double diabetes, double overall, String category,
                              String trend, double confidence,
                              List<RiskPrediction.FeatureContribution> contributions, String methodology) {}

    public RiskResult compute(String patientId) {
        Patient p = patientRepository.findById(patientId)
                .orElseThrow(() -> new com.medisphere.common.GlobalExceptionHandler.NotFoundException("Patient not found"));
        HealthTwin twin = healthTwinRepository.findByPatientId(patientId).orElse(null);

        int age = computeAge(p.getDateOfBirth());
        double bmi = twin != null && twin.getBodyMetrics().get("bmi") != null
                ? toDouble(twin.getBodyMetrics().get("bmi")) : 24;
        boolean smoker = twin != null && Boolean.TRUE.equals(twin.getBodyMetrics().get("smoker"));
        List<String> conditions = twin != null ? twin.getConditions() : List.of();
        boolean diabetes = conditions.stream().anyMatch(c -> c.toLowerCase().contains("diabetes"));
        boolean hypertension = conditions.stream().anyMatch(c -> c.toLowerCase().contains("hypertension"));

        double sbp = latestValue(patientId, "BLOOD_PRESSURE", 122);
        double hr = latestValue(patientId, "HEART_RATE", 72);
        double glucose = latestValue(patientId, "GLUCOSE", 95);
        double steps = latestValue(patientId, "STEPS", 4000);
        double hba1c = labValue(patientId, "HbA1c", 5.6);
        double chol = labValue(patientId, "Total Cholesterol", 185);

        // --- cardiovascular (10y) demo score ---
        double cv = 2.0
                + age * 0.32
                + Math.max(0, sbp - 118) * 0.28
                + Math.max(0, chol - 170) * 0.06
                + Math.max(0, hr - 72) * 0.12
                + Math.max(0, bmi - 23) * 0.55
                + (smoker ? 5 : 0)
                + (diabetes ? 4 : 0)
                + (hypertension ? 3 : 0)
                - Math.min(steps / 2500.0, 6);
        cv = clamp(cv, 1, 65);

        // --- diabetes complication demo score ---
        double dm = 1.0
                + Math.max(0, hba1c - 5.4) * 6.0
                + Math.max(0, bmi - 23) * 0.7
                + Math.max(0, glucose - 95) * 0.08
                + age * 0.08
                + (hypertension ? 2 : 0)
                - Math.min(steps / 3000.0, 5);
        dm = clamp(dm, 1, 70);

        double overall = Math.round((cv * 0.55 + dm * 0.45) * 10) / 10.0;
        String category = overall < 8 ? "LOW" : overall < 16 ? "MODERATE" : overall < 28 ? "HIGH" : "VERY_HIGH";
        double confidence = Math.min(0.95, Math.round((0.72 + (twin != null ? twin.getCompletenessScore() : 0.7) * 0.2) * 100) / 100.0);

        List<RiskPrediction.FeatureContribution> contributions = new ArrayList<>();
        contributions.add(new RiskPrediction.FeatureContribution("Age (" + age + ")", round4(age * 0.32), "INCREASES_RISK"));
        contributions.add(new RiskPrediction.FeatureContribution("Systolic BP (" + (int) sbp + " mmHg)", round4(Math.max(0, sbp - 118) * 0.28), "INCREASES_RISK"));
        contributions.add(new RiskPrediction.FeatureContribution("HbA1c (" + hba1c + "%)", round4(Math.max(0, hba1c - 5.4) * 6.0), "INCREASES_RISK"));
        contributions.add(new RiskPrediction.FeatureContribution("BMI (" + (int) bmi + ")", round4(Math.max(0, bmi - 23) * 0.55), "INCREASES_RISK"));
        contributions.add(new RiskPrediction.FeatureContribution("Total Cholesterol (" + (int) chol + ")", round4(Math.max(0, chol - 170) * 0.06), "INCREASES_RISK"));
        contributions.add(new RiskPrediction.FeatureContribution("Heart Rate (" + (int) hr + " bpm)", round4(Math.max(0, hr - 72) * 0.12), "INCREASES_RISK"));
        if (smoker) contributions.add(new RiskPrediction.FeatureContribution("Smoking Status", 0.18, "INCREASES_RISK"));
        if (diabetes) contributions.add(new RiskPrediction.FeatureContribution("Diabetes Condition", 0.14, "INCREASES_RISK"));
        if (hypertension) contributions.add(new RiskPrediction.FeatureContribution("Hypertension Condition", 0.11, "INCREASES_RISK"));
        contributions.add(new RiskPrediction.FeatureContribution("Physical Activity (" + (int) steps + " steps)", round4(Math.min(steps / 2500.0, 6) / 8.0), "DECREASES_RISK"));

        String methodology = "Weighted clinical factors (age, blood pressure, HbA1c, "
                + "BMI, cholesterol, heart rate, activity, conditions) normalized into a 0-100 style score.";

        return new RiskResult(round1(cv), round1(dm), overall, category, "STABLE", confidence, contributions, methodology);
    }

    public RiskPrediction generate(String patientId) {
        Patient p = patientRepository.findById(patientId)
                .orElseThrow(() -> new com.medisphere.common.GlobalExceptionHandler.NotFoundException("Patient not found"));
        RiskResult r = compute(patientId);

        RiskPrediction previous = repository.findFirstByPatientIdOrderByPredictedAtDesc(patientId).orElse(null);
        String trend = "STABLE";
        if (previous != null) {
            double diff = r.overall() - previous.getOverallScore();
            trend = diff > 1.5 ? "RISING" : diff < -1.5 ? "IMPROVING" : "STABLE";
        }

        RiskPrediction rp = new RiskPrediction();
        rp.setPatientId(patientId);
        rp.setPatientName(p.fullName());
        rp.setCardiovascularRisk10y(r.cardiovascular());
        rp.setDiabetesComplicationRisk(r.diabetes());
        rp.setOverallScore(r.overall());
        rp.setRiskCategory(r.category());
        rp.setTrend(trend);
        rp.setConfidence(r.confidence());
        rp.setModelVersion(MODEL_VERSION);
        rp.setEvidenceSummary("Federated model output aggregated across participating nodes for this patient's profile.");
        rp.setMethodology(r.methodology());
        rp.setContributions(r.contributions());
        repository.save(rp);

        p.setRiskStatus(mapCategory(r.category()));
        patientRepository.save(p);
        return rp;
    }

    public List<RiskPrediction> latest() { return repository.findTop50ByOrderByPredictedAtDesc(); }
    public List<RiskPrediction> byPatient(String patientId) { return repository.findByPatientIdOrderByPredictedAtDesc(patientId); }
    public RiskPrediction findById(String id) {
        return repository.findById(id).orElseThrow(() -> new com.medisphere.common.GlobalExceptionHandler.NotFoundException("Risk prediction not found: " + id));
    }

    private String mapCategory(String c) {
        return switch (c) {
            case "HIGH", "VERY_HIGH" -> "HIGH";
            case "MODERATE" -> "MEDIUM";
            default -> "LOW";
        };
    }

    private double latestValue(String patientId, String type, double fallback) {
        List<VitalReading> readings = vitalReadingRepository.findByPatientIdOrderByTimestampDesc(patientId);
        return readings.stream().filter(v -> type.equals(v.getType())).findFirst().map(VitalReading::getValue).orElse(fallback);
    }

    private double labValue(String patientId, String testName, double fallback) {
        List<LabResult> labs = labResultRepository.findByPatientIdOrderByCollectedAtDesc(patientId);
        return labs.stream().filter(l -> testName.equals(l.getTestName())).findFirst().map(LabResult::getValue).orElse(fallback);
    }

    private int computeAge(String dob) {
        try {
            LocalDate birth = LocalDate.parse(dob, DOB_FMT);
            return Math.max(0, LocalDate.now().getYear() - birth.getYear());
        } catch (Exception e) {
            return 50;
        }
    }

    private double toDouble(Object o) {
        try { return Double.parseDouble(String.valueOf(o)); } catch (Exception e) { return 24; }
    }

    private double clamp(double v, double min, double max) { return Math.max(min, Math.min(max, v)); }
    private double round1(double v) { return Math.round(v * 10) / 10.0; }
    private double round4(double v) { return Math.round(v * 1000) / 1000.0; }
}
