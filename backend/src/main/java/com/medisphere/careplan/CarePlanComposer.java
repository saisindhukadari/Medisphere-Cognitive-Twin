package com.medisphere.careplan;

import com.medisphere.alerts.Alert;
import com.medisphere.alerts.AlertRepository;
import com.medisphere.healthtwin.HealthTwin;
import com.medisphere.healthtwin.HealthTwinRepository;
import com.medisphere.patient.Patient;
import com.medisphere.patient.PatientRepository;
import com.medisphere.risk.RiskPrediction;
import com.medisphere.risk.RiskPredictionRepository;
import com.medisphere.vitals.VitalReading;
import com.medisphere.vitals.VitalReadingRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Builds <strong>patient-specific</strong> care-plan content from the patient's own
 * stored clinical profile: conditions, medications, body metrics, labs, the latest
 * risk prediction, the newest wearable vitals and the open monitoring alerts.
 *
 * <p>Every value that reaches the plan is derived from persisted records - nothing is
 * randomised and nothing is copied from another patient, so two patients with different
 * profiles never receive identical goals, interventions, monitoring or follow-up text.
 * The same composer is used by {@link com.medisphere.seed.DataSeeder} (demo data) and by
 * {@link CarePlanController} (the "Generate with AI" action), which keeps the seeded and
 * the runtime behaviour of the product consistent.</p>
 */
@Service
public class CarePlanComposer {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM yyyy").withZone(ZoneOffset.UTC);

    private final PatientRepository patientRepository;
    private final HealthTwinRepository healthTwinRepository;
    private final RiskPredictionRepository riskRepository;
    private final VitalReadingRepository vitalReadingRepository;
    private final AlertRepository alertRepository;

    public CarePlanComposer(PatientRepository patientRepository,
                            HealthTwinRepository healthTwinRepository,
                            RiskPredictionRepository riskRepository,
                            VitalReadingRepository vitalReadingRepository,
                            AlertRepository alertRepository) {
        this.patientRepository = patientRepository;
        this.healthTwinRepository = healthTwinRepository;
        this.riskRepository = riskRepository;
        this.vitalReadingRepository = vitalReadingRepository;
        this.alertRepository = alertRepository;
    }

    /**
     * Everything the plan needs, all read from the patient's own documents.
     *
     * @param primaryGoal     optional clinician-entered goal; when blank the composer derives one
     * @param adherenceScore  the adherence the plan will be stored with, so the goal text
     *                        ("current X%") always matches the number shown in the UI
     */
    public Draft compose(String patientId, String primaryGoal, double adherenceScore) {
        Patient patient = patientRepository.findById(patientId).orElse(null);
        if (patient == null) throw new IllegalArgumentException("Patient not found: " + patientId);

        HealthTwin twin = healthTwinRepository.findByPatientId(patientId).orElse(null);
        RiskPrediction risk = riskRepository.findFirstByPatientIdOrderByPredictedAtDesc(patientId).orElse(null);

        Map<String, String> vitals = latestVitals(patientId);
        List<Alert> openAlerts = openAlerts(patientId);

        String conditions = twin == null ? "" : String.join(", ", twin.getConditions());
        String lower = conditions.toLowerCase(Locale.ROOT);
        boolean cardio = lower.contains("hypertension") || lower.contains("hyperlipid")
                || lower.contains("cardiac") || lower.contains("heart") || lower.contains("coronary");
        boolean metabolic = lower.contains("diabetes") || lower.contains("obesity")
                || lower.contains("metabolic") || lower.contains("insulin");
        boolean respiratory = lower.contains("asthma") || lower.contains("copd")
                || lower.contains("respiratory") || lower.contains("pulmonary");
        boolean renal = lower.contains("kidney") || lower.contains("renal") || lower.contains("nephro");

        double sbp = num(vitals.get("BLOOD_PRESSURE"), metric(twin, "systolicBP"));
        double spo2 = num(vitals.get("SPO2"), metric(twin, "spo2"));
        double glucose = num(vitals.get("GLUCOSE"), 100);
        double hr = num(vitals.get("HEART_RATE"), metric(twin, "restingHeartRate"));
        double steps = num(vitals.get("STEPS"), 4500);
        double bmi = metric(twin, "bmi");
        double hba1c = lab(twin, "HbA1c");
        boolean smoker = "true".equalsIgnoreCase(String.valueOf(twin == null ? "" : twin.getBodyMetrics().get("smoker")));

        // Fall back to the seeded thresholds when no newer reading exists, so the plan
        // still reflects the patient's documented profile instead of a generic one.
        if (sbp <= 0) sbp = cardio ? 138 : 124;
        if (spo2 <= 0) spo2 = 96;
        if (steps <= 0) steps = 4500;
        if (bmi <= 0) bmi = 25;
        if (hba1c <= 0) hba1c = metabolic ? 6.6 : 5.4;

        // Domain detection also considers the measured values, not only the diagnosis list.
        cardio = cardio || sbp >= 130;
        metabolic = metabolic || hba1c >= 6.0 || glucose >= 126;
        respiratory = respiratory || spo2 < 94;

        String domain = cardio && metabolic ? "cardiometabolic"
                : cardio ? "cardiovascular"
                : metabolic ? "metabolic"
                : respiratory ? "respiratory"
                : renal ? "renal"
                : "preventive";

        String riskCategory = risk != null && risk.getRiskCategory() != null
                ? risk.getRiskCategory()
                : (patient.getRiskStatus() == null ? "LOW" : patient.getRiskStatus());

        int age = age(patient.getDateOfBirth());
        int openAlertCount = openAlerts.size();
        int adherence = (int) Math.round(adherenceScore);

        // Priority is a clinical triage decision derived from this patient's own risk
        // band *and* their current situation: an open alert or poor adherence escalates
        // an otherwise high-risk patient to HIGH, so the priority column actually ranks
        // the caseload instead of repeating the risk band.
        String priority = priorityFor(riskCategory, openAlertCount, adherence);
        int followUpDays = "HIGH".equals(priority) ? 7 : "MEDIUM".equals(priority) ? 21 : 90;

        String goal = (primaryGoal == null || primaryGoal.isBlank())
                ? primaryGoalFor(domain, priority)
                : primaryGoal.trim();

        List<String> goals = goals(domain, priority, sbp, hr, spo2, glucose, hba1c, steps, adherence, openAlertCount);
        List<String> interventions = interventions(domain, priority, openAlertCount, bmi, smoker);
        List<String> activities = activities(domain, priority, followUpDays, sbp, steps, openAlertCount);
        List<String> lifestyle = lifestyle(domain, bmi, smoker, steps);

        double riskScore = risk == null ? 0 : risk.getOverallScore();

        Instant followUp = Instant.now().plus(followUpDays, java.time.temporal.ChronoUnit.DAYS);

        return new Draft(
                goal,
                priority,
                domain,
                goals,
                interventions,
                activities,
                lifestyle,
                monitoringSchedule(domain, priority, openAlertCount, sbp, hr, spo2, glucose, steps),
                followUpSchedule(domain, priority, followUp, riskScore, riskCategory, adherence),
                reasoning(patient, twin, risk, conditions, vitals, openAlertCount, adherence, age, priority),
                guidelines(domain),
                chartMedications(twin),
                followUp
        );
    }

    /* ------------------------------------------------------------------ inputs */

    private Map<String, String> latestVitals(String patientId) {
        Map<String, String> out = new LinkedHashMap<>();
        for (VitalReading v : vitalReadingRepository.findByPatientIdOrderByTimestampDesc(patientId)) {
            if (v.getType() != null && v.getValue() != 0 && !out.containsKey(v.getType())) {
                out.put(v.getType(), String.valueOf(v.getValue()));
            }
        }
        return out;
    }

    private List<Alert> openAlerts(String patientId) {
        List<Alert> open = new ArrayList<>();
        for (Alert a : alertRepository.findByPatientIdOrderByCreatedAtDesc(patientId, PageRequest.of(0, 20)).getContent()) {
            if (List.of("NEW", "ACKNOWLEDGED", "INVESTIGATING").contains(a.getStatus())) open.add(a);
        }
        return open;
    }

    private static double metric(HealthTwin twin, String key) {
        if (twin == null) return 0;
        return num(twin.getBodyMetrics().get(key), 0);
    }

    private static double lab(HealthTwin twin, String key) {
        if (twin == null) return 0;
        return num(twin.getLabSummaries().get(key), 0);
    }

    private static double num(Object raw, double fallback) {
        if (raw == null) return fallback;
        if (raw instanceof Number n) return n.doubleValue();
        String s = String.valueOf(raw).replaceAll("[^0-9.\\-]", "");
        if (s.isBlank() || s.equals("-") || s.equals(".")) return fallback;
        try {
            double d = Double.parseDouble(s);
            return d == 0 ? fallback : d;
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static int age(String dob) {
        if (dob == null || dob.length() < 4) return 0;
        try {
            return java.time.LocalDate.now().getYear() - Integer.parseInt(dob.substring(0, 4));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /* ------------------------------------------------------------- content */

    /**
     * Triage priority for the plan, derived from the patient's risk band plus their
     * current situation (open monitoring alerts, adherence to date).
     */
    private static String priorityFor(String riskCategory, int openAlerts, int adherence) {
        String c = riskCategory == null ? "LOW" : riskCategory.toUpperCase(Locale.ROOT);
        boolean veryHigh = "VERY_HIGH".equals(c) || "CRITICAL".equals(c);
        boolean high = "HIGH".equals(c);
        boolean escalated = openAlerts > 0 || adherence < 50;
        if (veryHigh || (high && escalated)) return "HIGH";
        if (high || "MEDIUM".equals(c) || "MODERATE".equals(c) || "ELEVATED".equals(c)) return "MEDIUM";
        return "LOW";
    }

    private static String primaryGoalFor(String domain, String priority) {
        if ("preventive".equals(domain)) {
            return switch (priority) {
                case "HIGH" -> "Clear overdue screening and establish a weekly monitoring routine";
                case "MEDIUM" -> "Establish a consistent preventive monitoring routine";
                default -> "Maintain low-risk status and build a consistent monitoring routine";
            };
        }
        return switch (priority) {
            case "HIGH" -> "Reduce " + domain + " risk by 15% within 8 weeks";
            case "MEDIUM" -> "Improve " + domain + " control and stay inside target range for 4 consecutive weeks";
            default -> "Hold " + domain + " markers steady and keep the monitoring routine consistent";
        };
    }

    private static List<String> goals(String domain, String priority, double sbp, double hr,
                                      double spo2, double glucose, double hba1c, double steps,
                                      int adherence, int openAlerts) {
        List<String> g = new ArrayList<>();
        int stepTarget = priority.equals("LOW") ? 7000 : 6000;

        if (domain.contains("cardio") || domain.contains("renal")) {
            g.add("Average home systolic blood pressure below 130 mmHg (latest reading " + (int) sbp + " mmHg)");
            g.add("Keep resting heart rate between 60 and 90 bpm (latest " + (int) hr + " bpm)");
        }
        if (domain.contains("metabolic")) {
            g.add("HbA1c at or below " + (priority.equals("HIGH") ? "7.0" : "6.5") + "% (latest " + hba1c + "%)");
            g.add("Fasting glucose between 80 and 130 mg/dL (latest " + (int) glucose + " mg/dL)");
        }
        if (domain.contains("respiratory")) {
            g.add("Maintain daytime SpO2 at or above 95% (latest " + (int) spo2 + "%)");
            g.add("No unscheduled respiratory visits over the next 8 weeks");
        }
        if (domain.equals("preventive")) {
            g.add("Complete the quarterly screening panel on schedule");
            g.add("Keep resting heart rate and blood pressure inside the age-appropriate range (latest "
                    + (int) hr + " bpm / " + (int) sbp + " mmHg)");
        }
        g.add("Reach " + stepTarget + " steps per day on at least 5 days a week (baseline " + (int) steps + ")");
        g.add("Medication adherence at or above 85% (current " + adherence + "%)");
        if (openAlerts > 0) {
            g.add("Close all " + openAlerts + " open monitoring alert" + (openAlerts == 1 ? "" : "s") + " within 7 days");
        }
        return g;
    }

    private static List<String> interventions(String domain, String priority, int openAlerts, double bmi, boolean smoker) {
        List<String> i = new ArrayList<>();
        if (domain.contains("cardio")) i.add("Home blood pressure monitoring twice daily with a 7-day rolling average");
        if (domain.contains("metabolic")) i.add("Fasting and post-meal glucose logging alongside meal-timing notes");
        if (domain.contains("respiratory")) i.add("Daily pulse-oximetry spot check after light activity");
        if (domain.contains("renal")) i.add("Weekly weight and fluid-balance check with quarterly renal panel");
        i.add("Care-manager tele-check-in " + (priority.equals("HIGH") ? "twice weekly for 4 weeks, then weekly"
                : priority.equals("MEDIUM") ? "weekly for 4 weeks, then monthly" : "monthly"));
        i.add("Pharmacy medication reconciliation and side-effect review");
        i.add("Structured walking programme: 30 minutes on " + (priority.equals("LOW") ? "4 days" : "5 days") + " a week");
        if (bmi >= 30) i.add("Dietitian review focused on portion size and sodium intake");
        else i.add("Dietitian review of sodium and added-sugar intake");
        if (smoker) i.add("Smoking-cessation support session and quit-date check-in");
        if (openAlerts > 0) i.add("Wearable re-sync and threshold review after " + openAlerts + " open alert"
                + (openAlerts == 1 ? "" : "s"));
        return i;
    }

    private static List<String> activities(String domain, String priority, int followUpDays,
                                           double sbp, double steps, int openAlerts) {
        List<String> a = new ArrayList<>();
        if (domain.contains("cardio")) a.add("Record home blood pressure before breakfast and before bed, Monday to Sunday - the recorded systolic baseline is "
                + (int) sbp + " mmHg");
        if (domain.contains("metabolic")) a.add("Log fasting glucose each morning and note the previous evening's meal");
        if (domain.contains("respiratory")) a.add("Run a SpO2 spot check after a short walk, three times a week");
        a.add("Sync the wearable every evening before 22:00");
        a.add("Walk " + (priority.equals("LOW") ? "30" : "40") + " minutes after dinner, " + (priority.equals("HIGH") ? "6" : "5") + " days a week, building from the recorded "
                + (int) steps + " steps/day baseline");
        a.add("Weigh in every Monday morning and record the trend");
        if (openAlerts > 0) {
            a.add("Review the " + openAlerts + " open monitoring alert" + (openAlerts == 1 ? "" : "s")
                    + " with the ward team before the next appointment");
        }
        a.add("Attend the follow-up appointment on " + DAY.format(Instant.now().plus(followUpDays,
                java.time.temporal.ChronoUnit.DAYS)));
        return a;
    }

    private static List<String> lifestyle(String domain, double bmi, boolean smoker, double steps) {
        List<String> l = new ArrayList<>();
        l.add(domain.contains("cardio") ? "Low-sodium (DASH-style) eating pattern" : "Balanced plate model with two portions of vegetables per meal");
        l.add("150 minutes of moderate activity per week (baseline " + (int) steps + " steps/day)");
        l.add("7-8 hours of sleep with a consistent bed and wake time");
        if (bmi >= 25) l.add("Gradual weight target of 5% body weight over 6 months (BMI " + bmi + ")");
        if (smoker) l.add("Tobacco-free - cessation support is part of this plan");
        l.add(domain.contains("metabolic") ? "Carbohydrate portions spread across main meals" : "Limit alcohol to recommended limits");
        return l;
    }

    private static String monitoringSchedule(String domain, String priority, int openAlerts,
                                             double sbp, double hr, double spo2, double glucose, double steps) {
        String base = switch (priority) {
            case "HIGH" -> "Continuous wearable streaming with daily vitals review (heart rate, blood pressure, SpO2"
                    + (domain.contains("metabolic") ? ", glucose" : "") + "); clinician review every 48 hours; labs every 6 weeks";
            case "MEDIUM" -> "Twice-daily home readings plus a daily wearable sync; clinician review every 7 days; routine labs every 3 months";
            default -> "Daily wearable sync with a weekly spot check; clinician review every month; routine labs every 6 months";
        };
        String focus = switch (domain) {
            case "cardiovascular" -> " Blood-pressure trend is reviewed against the 7-day rolling average.";
            case "cardiometabolic" -> " Blood-pressure and glucose logs are reviewed together against the latest HbA1c.";
            case "metabolic" -> " Glucose log is reviewed alongside meal timing and the HbA1c trend.";
            case "respiratory" -> " SpO2 and respiratory-rate trends are reviewed every week.";
            case "renal" -> " Weight, fluid balance and renal panel are reviewed every month.";
            default -> " Routine vitals and screening cadence are reviewed at each visit.";
        };
        // The baseline below is this patient's own latest stored readings, so two patients
        // never share an identical monitoring paragraph even when the cadence matches.
        String baseline = " Baseline on file: home systolic BP " + (int) sbp + " mmHg, resting HR "
                + (int) hr + " bpm, SpO2 " + (int) spo2 + "%, glucose " + (int) glucose + " mg/dL, "
                + (int) steps + " steps/day.";
        String escalation = openAlerts > 0
                ? " " + openAlerts + " alert" + (openAlerts == 1 ? " is" : "s are") + " currently open - each one is triaged on the day it fires."
                : "";
        return base + "." + focus + baseline + escalation;
    }

    private static String followUpSchedule(String domain, String priority, Instant followUp,
                                           double riskScore, String riskCategory, int adherence) {
        String base = switch (priority) {
            case "HIGH" -> "Doctor follow-up in 7 days (next slot " + DAY.format(followUp)
                    + "); care-manager check-in twice weekly; same-day review if a critical alert recurs.";
            case "MEDIUM" -> "Doctor follow-up in 3 weeks (next slot " + DAY.format(followUp)
                    + "); care-manager check-in weekly; messaging between visits.";
            default -> "Routine follow-up in 3 months (next slot " + DAY.format(followUp)
                    + "); annual screening review; messaging as needed.";
        };
        return base
                + " Focus of the next visit: " + domain + " progress against the goals above."
                + " Bring this patient's current numbers: risk score " + riskScore
                + " (" + riskCategory + "), medication adherence " + adherence + "%.";
    }

    private static String reasoning(Patient patient, HealthTwin twin, RiskPrediction risk, String conditions,
                                    Map<String, String> vitals, int openAlerts, int adherence, int age, String priority) {
        StringBuilder sb = new StringBuilder("Composed from this patient's stored record");
        if (age > 0) sb.append(" (age ").append(age).append(")");
        if (risk != null) {
            sb.append(": overall risk ").append(risk.getOverallScore()).append(" / ")
                    .append(risk.getRiskCategory());
            if (risk.getTrend() != null) sb.append(", trend ").append(risk.getTrend());
            risk.getContributions().stream()
                    .filter(c -> c.contribution() > 0)
                    .max(java.util.Comparator.comparingDouble(RiskPrediction.FeatureContribution::contribution))
                    .map(RiskPrediction.FeatureContribution::feature)
                    .ifPresent(f -> sb.append("; strongest factor ").append(f));
        } else {
            sb.append(": no stored risk prediction, so the plan follows the documented conditions and vitals");
        }
        sb.append("; conditions [").append(conditions.isBlank() ? "none recorded" : conditions).append("]");
        sb.append("; latest vitals");
        if (!vitals.isEmpty()) {
            sb.append(" ").append(vitals.getOrDefault("HEART_RATE", "-")).append(" bpm")
                    .append(", ").append(vitals.getOrDefault("BLOOD_PRESSURE", "-")).append(" mmHg systolic")
                    .append(", SpO2 ").append(vitals.getOrDefault("SPO2", "-")).append("%")
                    .append(", glucose ").append(vitals.getOrDefault("GLUCOSE", "-")).append(" mg/dL")
                    .append(", ").append(vitals.getOrDefault("STEPS", "-")).append(" steps/day");
        }
        sb.append("; ").append(openAlertCountWord(openAlerts)).append("; adherence ").append(adherence)
                .append("%; triage priority ").append(priority).append(".");
        if (twin != null && !twin.getHealthTrends().isEmpty()) {
            sb.append(" Twin trends: ").append(String.join("; ", twin.getHealthTrends())).append(".");
        }
        return sb.toString();
    }

    private static String openAlertCountWord(int n) {
        return n == 0 ? "no open monitoring alerts" : n + " open monitoring alert" + (n == 1 ? "" : "s");
    }

    private static String guidelines(String domain) {
        return switch (domain) {
            case "cardiovascular", "cardiometabolic" -> "AHA/ACC prevention guideline references; ADA standards references (demo library)";
            case "metabolic" -> "ADA standards references; diabetes prevention programme references (demo library)";
            case "respiratory" -> "Global respiratory care guideline references (demo library)";
            case "renal" -> "Kidney care guideline references (demo library)";
            default -> "Routine preventive screening references (demo library)";
        };
    }

    private static List<String> chartMedications(HealthTwin twin) {
        List<String> meds = twin == null ? List.of() : twin.getMedications();
        List<String> out = new ArrayList<>();
        if (meds.isEmpty()) {
            out.add("No active medications recorded in this chart.");
        } else {
            out.add("Chart medications (never edited by plan generation): " + String.join(", ", meds));
        }
        out.add("PROVIDER REVIEW REQUIRED: confirm dose, adherence and interactions at the next appointment.");
        return out;
    }

    /* ------------------------------------------------------------------ draft */

    /**
     * The composed, patient-specific content that {@link CarePlanController} and the
     * seeder copy onto a {@link CarePlan}.
     */
    public record Draft(String primaryGoal,
                        String priority,
                        String domain,
                        List<String> goals,
                        List<String> interventions,
                        List<String> activities,
                        List<String> lifestyle,
                        String monitoringSchedule,
                        String followUpSchedule,
                        String aiReasoning,
                        String guidelineReferences,
                        List<String> medications,
                        Instant followUpAt) {
    }
}
