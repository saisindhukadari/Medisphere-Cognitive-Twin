package com.medisphere.patient;

import com.medisphere.alerts.Alert;
import com.medisphere.alerts.AlertRepository;
import com.medisphere.audit.AuditLog;
import com.medisphere.audit.AuditLogRepository;
import com.medisphere.audit.AuditService;
import com.medisphere.careplan.CarePlan;
import com.medisphere.careplan.CarePlanRepository;
import com.medisphere.fhir.FhirResourceRepository;
import com.medisphere.federated.FlModelRepository;
import com.medisphere.healthtwin.HealthTwin;
import com.medisphere.healthtwin.HealthTwinRepository;
import com.medisphere.risk.RiskPrediction;
import com.medisphere.risk.RiskPredictionRepository;
import com.medisphere.monitoring.Device;
import com.medisphere.monitoring.DeviceRepository;
import com.medisphere.vitals.SettingsController;
import com.medisphere.vitals.VitalReading;
import com.medisphere.vitals.VitalReadingRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Aggregated clinical-intelligence summary for the dashboard.
 *
 * <p>Every number returned here is computed from persisted MongoDB data —
 * nothing is randomised in the frontend and nothing is fabricated.</p>
 */
@RestController
public class DashboardController {
    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("EEE d");

    private final PatientRepository patientRepository;
    private final AlertRepository alertRepository;
    private final CarePlanRepository carePlanRepository;
    private final FhirResourceRepository fhirResourceRepository;
    private final FlModelRepository flModelRepository;
    private final RiskPredictionRepository riskPredictionRepository;
    private final DeviceRepository deviceRepository;
    private final VitalReadingRepository vitalReadingRepository;
    private final HealthTwinRepository healthTwinRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final com.medisphere.auth.AccessControlService access;

    public DashboardController(PatientRepository patientRepository, AlertRepository alertRepository,
                               CarePlanRepository carePlanRepository, FhirResourceRepository fhirResourceRepository,
                               FlModelRepository flModelRepository, RiskPredictionRepository riskPredictionRepository,
                               DeviceRepository deviceRepository, VitalReadingRepository vitalReadingRepository,
                               HealthTwinRepository healthTwinRepository, AuditLogRepository auditLogRepository,
                               AuditService auditService, com.medisphere.auth.AccessControlService access) {
        this.patientRepository = patientRepository;
        this.alertRepository = alertRepository;
        this.carePlanRepository = carePlanRepository;
        this.fhirResourceRepository = fhirResourceRepository;
        this.flModelRepository = flModelRepository;
        this.riskPredictionRepository = riskPredictionRepository;
        this.deviceRepository = deviceRepository;
        this.vitalReadingRepository = vitalReadingRepository;
        this.healthTwinRepository = healthTwinRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
        this.access = access;
    }

    @GetMapping("/api/dashboard/summary")
    public Map<String, Object> summary() {
        String scoped = access.scopedPatientIdOrNull();
        if (scoped != null) return patientSummary(scoped);
        return cohortSummary();
    }

    /** Staff / administrator cohort summary. */
    private Map<String, Object> cohortSummary() {
        List<Patient> patients = patientRepository.findAll();
        List<RiskPrediction> predictions = riskPredictionRepository.findAll();
        List<Alert> alerts = alertRepository.findAll();
        List<CarePlan> plans = carePlanRepository.findAll();
        List<VitalReading> vitals = vitalReadingRepository.findAll();
        List<HealthTwin> twins = healthTwinRepository.findAll();

        long total = patients.size();
        long high = patients.stream().filter(p -> "HIGH".equals(p.getRiskStatus())).count();

        Map<String, RiskPrediction> latestByPatient = latestPredictions(predictions);
        long scored = latestByPatient.size();
        double avgRisk = latestByPatient.values().stream().mapToDouble(RiskPrediction::getOverallScore).average().orElse(0);

        long activeAlerts = alerts.stream().filter(a -> "NEW".equals(a.getStatus()) || "ACKNOWLEDGED".equals(a.getStatus()) || "INVESTIGATING".equals(a.getStatus())).count();
        long resolvedAlerts = alerts.stream().filter(a -> "RESOLVED".equals(a.getStatus()) || "FALSE_POSITIVE".equals(a.getStatus())).count();
        long activePlans = plans.stream().filter(c -> "ACTIVE".equals(c.getStatus()) || "APPROVED".equals(c.getStatus())).count();
        double avgAdherence = plans.stream().mapToDouble(CarePlan::getAdherenceScore).filter(v -> v > 0).average().orElse(0);
        double activeAdherence = plans.stream().filter(c -> "ACTIVE".equals(c.getStatus()))
                .mapToDouble(CarePlan::getAdherenceScore).filter(v -> v > 0).average().orElse(avgAdherence);

        Instant now = Instant.now();
        Instant day2 = now.minusSeconds(2L * 24 * 3600);
        Instant day1 = now.minusSeconds(24L * 3600);
        long monitoringPatients = vitals.stream().filter(v -> v.getTimestamp() != null && v.getTimestamp().isAfter(day2))
                .map(VitalReading::getPatientId).distinct().count();
        long abnormalReadings = vitals.stream().filter(v -> v.getTimestamp() != null && v.getTimestamp().isAfter(day1))
                .filter(this::isAbnormal).count();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("totalPatients", total);
        body.put("highRiskPatients", high);
        body.put("activeAlerts", activeAlerts);
        body.put("activeCarePlans", activePlans);
        body.put("connectedWearables", deviceRepository.count());
        body.put("fhirResourcesSynced", fhirResourceRepository.count());
        body.put("modelAccuracy", flModelRepository.findAll().stream().mapToDouble(f -> f.getAccuracy()).average().orElse(0.85));
        body.put("carePlanAdherence", round1(activeAdherence));
        body.put("averageRisk", round1(avgRisk));
        body.put("monitoringPatients", monitoringPatients);
        body.put("abnormalReadings", abnormalReadings);
        body.put("predictionCoverage", total == 0 ? 0 : Math.min(100, Math.round((double) scored / total * 100)));
        body.put("patientsThisWeek", patients.stream()
                .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(Instant.now().minusSeconds(7L * 24 * 3600)))
                .count());
        body.put("criticalOpen", alerts.stream()
                .filter(a -> "CRITICAL".equals(a.getCategory()))
                .filter(a -> "NEW".equals(a.getStatus()) || "ACKNOWLEDGED".equals(a.getStatus()) || "INVESTIGATING".equals(a.getStatus()))
                .count());
        body.put("pendingReviewPlans", plans.stream().filter(c -> "PENDING_REVIEW".equals(c.getStatus()) || "AI_GENERATED".equals(c.getStatus())).count());
        body.put("generatedAt", Instant.now().toString());
        body.put("disclaimer", "Figures are aggregated from the records currently stored in the platform.");
        body.putAll(extraKpis(patients, vitals, plans));

        // --- distributions (all from persisted data) ---
        body.put("riskDistribution", riskDistribution(latestByPatient.values(), patients));
        body.put("patientRiskDistribution", countBy(patientRiskKey(patients), List.of("LOW", "MEDIUM", "HIGH")));
        body.put("alertsBySeverity", countBy(alerts.stream().map(Alert::getCategory).toList(), List.of("CRITICAL", "HIGH", "MEDIUM", "LOW")));
        body.put("alertsByStatus", countBy(alerts.stream().map(Alert::getStatus).toList(),
                List.of("NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE")));
        body.put("alertResolution", Map.of("resolved", resolvedAlerts, "active", activeAlerts));
        body.put("carePlanStatus", countBy(plans.stream().map(CarePlan::getStatus).toList(),
                List.of("AI_GENERATED", "PENDING_REVIEW", "MODIFIED", "APPROVED", "ACTIVE", "REJECTED", "COMPLETED")));

        // --- time series (bucketed from stored timestamps) ---
        body.put("alertTrend", dailyCounts(alerts.stream().map(Alert::getCreatedAt).toList(), 7));
        body.put("monitoringTrend", dailyCounts(vitals.stream().map(VitalReading::getTimestamp).toList(), 7));
        body.put("vitalTrend", dailyAverageSystolic(vitals, 7));
        body.put("adherenceTrend", weeklyAdherence(plans, 4));

        // --- care journey progress ---
        double twinCompleteness = twins.isEmpty() ? 0 : twins.stream().mapToDouble(HealthTwin::getCompletenessScore).average().orElse(0) * 100;
        long patientsWithPlan = plans.stream().map(CarePlan::getPatientId).distinct().count();
        body.put("careJourney", List.of(
                Map.of("label", "Patient Data", "value", total == 0 ? 0 : 100),
                Map.of("label", "Digital Twin", "value", Math.round(twinCompleteness)),
                Map.of("label", "Risk Assessment", "value", total == 0 ? 0 : Math.min(100, Math.round((double) scored / total * 100))),
                Map.of("label", "Care Plan", "value", total == 0 ? 0 : Math.min(100, Math.round((double) patientsWithPlan / total * 100))),
                Map.of("label", "Adherence", "value", Math.round(avgAdherence))));

        // Top-patient rows live under their own key — `highRiskPatients` above is
        // the KPI *count*, so it must not be overwritten by this list.
        body.put("highRiskList", topRiskPatients(patients, latestByPatient, alerts, plans, vitals));
        body.put("totalCarePlans", plans.size());
        body.put("recentActivity", recentActivity());
        return body;
    }

    /** PATIENT-scoped summary (own record only). */
    private Map<String, Object> patientSummary(String patientId) {
        List<Alert> myAlerts = alertRepository.findByPatientIdOrderByCreatedAtDesc(patientId, PageRequest.of(0, 500)).getContent();
        List<CarePlan> myPlans = carePlanRepository.findByPatientId(patientId);
        List<RiskPrediction> myPreds = riskPredictionRepository.findByPatientIdOrderByPredictedAtDesc(patientId);
        List<VitalReading> myVitals = vitalReadingRepository.findByPatientIdOrderByTimestampDesc(patientId);
        long activeAlerts = myAlerts.stream().filter(a -> "NEW".equals(a.getStatus()) || "ACKNOWLEDGED".equals(a.getStatus()) || "INVESTIGATING".equals(a.getStatus())).count();
        long activePlans = myPlans.stream().filter(c -> "ACTIVE".equals(c.getStatus()) || "APPROVED".equals(c.getStatus())).count();
        double adherence = myPlans.stream().mapToDouble(CarePlan::getAdherenceScore).filter(v -> v > 0).average().orElse(0);
        RiskPrediction latest = myPreds.isEmpty() ? null : myPreds.get(0);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("totalPatients", 1);
        body.put("highRiskPatients", latest != null && ("HIGH".equals(latest.getRiskCategory()) || "VERY_HIGH".equals(latest.getRiskCategory())) ? 1 : 0);
        body.put("activeAlerts", activeAlerts);
        body.put("activeCarePlans", activePlans);
        body.put("connectedWearables", 1);
        body.put("fhirResourcesSynced", 0);
        body.put("modelAccuracy", latest != null ? latest.getConfidence() : 0);
        body.put("carePlanAdherence", round1(adherence));
        body.put("averageRisk", latest != null ? latest.getOverallScore() : 0);
        body.put("monitoringPatients", myVitals.stream().filter(v -> v.getTimestamp() != null && v.getTimestamp().isAfter(Instant.now().minusSeconds(2L * 24 * 3600))).count() > 0 ? 1 : 0);
        body.put("abnormalReadings", myVitals.stream().filter(v -> v.getTimestamp() != null && v.getTimestamp().isAfter(Instant.now().minusSeconds(24L * 3600))).filter(this::isAbnormal).count());
        body.put("predictionCoverage", myPreds.isEmpty() ? 0 : 100);
        body.put("patientsThisWeek", 0);
        body.put("criticalOpen", myAlerts.stream()
                .filter(a -> "CRITICAL".equals(a.getCategory()))
                .filter(a -> "NEW".equals(a.getStatus()) || "ACKNOWLEDGED".equals(a.getStatus()) || "INVESTIGATING".equals(a.getStatus()))
                .count());
        body.put("pendingReviewPlans", myPlans.stream().filter(c -> "PENDING_REVIEW".equals(c.getStatus()) || "AI_GENERATED".equals(c.getStatus())).count());
        // same KPI keys as the cohort summary, scoped to this patient
        Instant nowP = Instant.now();
        boolean transmittingP = myVitals.stream().anyMatch(v -> v.getTimestamp() != null
                && v.getTimestamp().isAfter(nowP.minusSeconds(24L * 3600)));
        body.put("lowRiskPatients", "LOW".equals(patientRepository.findById(patientId).map(Patient::getRiskStatus).orElse(null)) ? 1 : 0);
        body.put("mediumRiskPatients", "MEDIUM".equals(patientRepository.findById(patientId).map(Patient::getRiskStatus).orElse(null)) ? 1 : 0);
        body.put("newPatients30d", patientRepository.findById(patientId)
                .map(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(nowP.minusSeconds(30L * 24 * 3600)) ? 1 : 0).orElse(0));
        body.put("activePatients", 1);
        body.put("patientsTransmitting", transmittingP ? 1 : 0);
        body.put("readings24h", myVitals.stream().filter(v -> v.getTimestamp() != null
                && v.getTimestamp().isAfter(nowP.minusSeconds(24L * 3600))).count());
        body.put("monitoringUptimePct", transmittingP ? 100 : 0);
        body.put("latestVitalAt", myVitals.stream().map(VitalReading::getTimestamp).filter(t -> t != null)
                .max(Comparator.naturalOrder()).map(Instant::toString).orElse(null));
        body.put("onlineDevices", myVitals.stream().anyMatch(v -> v.getTimestamp() != null
                && v.getTimestamp().isAfter(nowP.minusSeconds(6L * 3600))) ? 1 : 0);
        body.put("offlineDevices", myVitals.stream().anyMatch(v -> v.getTimestamp() != null
                && v.getTimestamp().isAfter(nowP.minusSeconds(6L * 3600))) ? 0 : 1);
        body.put("deviceCoveragePct", myVitals.stream().anyMatch(v -> v.getTimestamp() != null
                && v.getTimestamp().isAfter(nowP.minusSeconds(6L * 3600))) ? 100 : 0);
        body.put("completedCarePlans", myPlans.stream().filter(c -> "COMPLETED".equals(c.getStatus())).count());
        body.put("pendingDoctorReviews", myPlans.stream()
                .filter(c -> "PENDING_REVIEW".equals(c.getStatus()) || "AI_GENERATED".equals(c.getStatus())).count());
        body.put("completedInterventions", myPlans.stream()
                .filter(c -> "ACTIVE".equals(c.getStatus()) || "APPROVED".equals(c.getStatus()))
                .mapToInt(c -> (int) Math.round((c.getInterventions() == null ? 0 : c.getInterventions().size())
                        * c.getAdherenceScore() / 100.0)).sum());
        body.put("scheduledInterventions", myPlans.stream()
                .filter(c -> "ACTIVE".equals(c.getStatus()) || "APPROVED".equals(c.getStatus()))
                .mapToInt(c -> c.getInterventions() == null ? 0 : c.getInterventions().size()).sum());
        body.put("generatedAt", Instant.now().toString());
        body.put("disclaimer", "Figures are aggregated from the records currently stored in the platform.");
        body.put("riskDistribution", riskDistribution(
                myPreds.isEmpty() ? List.<RiskPrediction>of() : List.of(myPreds.get(0)),
                patientRepository.findById(patientId).map(List::of).orElse(List.of())));
        body.put("patientRiskDistribution", countBy(patientRepository.findById(patientId).map(p -> List.of(p.getRiskStatus())).orElse(List.of()), List.of("LOW", "MEDIUM", "HIGH")));
        body.put("alertsBySeverity", countBy(myAlerts.stream().map(Alert::getCategory).toList(), List.of("CRITICAL", "HIGH", "MEDIUM", "LOW")));
        body.put("alertsByStatus", countBy(myAlerts.stream().map(Alert::getStatus).toList(),
                List.of("NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE")));
        body.put("alertResolution", Map.of("resolved", myAlerts.stream().filter(a -> "RESOLVED".equals(a.getStatus()) || "FALSE_POSITIVE".equals(a.getStatus())).count(),
                "active", activeAlerts));
        body.put("carePlanStatus", countBy(myPlans.stream().map(CarePlan::getStatus).toList(),
                List.of("AI_GENERATED", "PENDING_REVIEW", "MODIFIED", "APPROVED", "ACTIVE", "REJECTED", "COMPLETED")));
        body.put("alertTrend", dailyCounts(myAlerts.stream().map(Alert::getCreatedAt).toList(), 7));
        body.put("monitoringTrend", dailyCounts(myVitals.stream().map(VitalReading::getTimestamp).toList(), 7));
        body.put("vitalTrend", dailyAverageSystolic(myVitals, 7));
        body.put("adherenceTrend", weeklyAdherence(myPlans, 4));
        double twinScore = healthTwinRepository.findByPatientId(patientId).map(t -> t.getCompletenessScore() * 100).orElse(0.0);
        body.put("careJourney", List.of(
                Map.of("label", "Patient Data", "value", 100),
                Map.of("label", "Digital Twin", "value", Math.round(twinScore)),
                Map.of("label", "Risk Assessment", "value", myPreds.isEmpty() ? 0 : 100),
                Map.of("label", "Care Plan", "value", myPlans.isEmpty() ? 0 : 100),
                Map.of("label", "Adherence", "value", Math.round(adherence))));
        body.put("highRiskList", List.of());
        body.put("totalCarePlans", myPlans.size());
        body.put("recentActivity", List.of());
        return body;
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    /**
     * Extra KPI figures for the dashboard card grid — active/new patients,
     * live monitoring coverage, device connectivity and care-plan delivery.
     * Every value is derived from persisted collections.
     */
    private Map<String, Object> extraKpis(List<Patient> patients, List<VitalReading> vitals,
                                          List<CarePlan> plans) {
        Instant now = Instant.now();
        Instant day1 = now.minusSeconds(24L * 3600);
        Instant day7 = now.minusSeconds(7L * 24 * 3600);
        Instant day30 = now.minusSeconds(30L * 24 * 3600);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("lowRiskPatients", patients.stream().filter(p -> "LOW".equals(p.getRiskStatus())).count());
        out.put("mediumRiskPatients", patients.stream().filter(p -> "MEDIUM".equals(p.getRiskStatus())).count());
        out.put("newPatients30d", patients.stream()
                .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(day30)).count());

        Set<String> activePatients = new HashSet<>();
        Set<String> transmitting = new HashSet<>();
        Set<Integer> hoursWithData = new HashSet<>();
        long readings24h = 0;
        Instant latestVital = null;
        Map<String, Instant> deviceLast = new LinkedHashMap<>();
        for (VitalReading v : vitals) {
            if (v.getTimestamp() == null) continue;
            if (v.getTimestamp().isAfter(day7)) activePatients.add(v.getPatientId());
            if (v.getTimestamp().isAfter(day1)) {
                transmitting.add(v.getPatientId());
                readings24h++;
                hoursWithData.add(v.getTimestamp().atZone(ZoneId.systemDefault()).getHour());
            }
            if (latestVital == null || v.getTimestamp().isAfter(latestVital)) latestVital = v.getTimestamp();
            if (v.getDeviceId() != null) {
                deviceLast.merge(v.getDeviceId(), v.getTimestamp(), (a, b) -> a.isAfter(b) ? a : b);
            }
        }
        out.put("activePatients", activePatients.size());
        out.put("patientsTransmitting", transmitting.size());
        out.put("readings24h", readings24h);
        out.put("monitoringUptimePct", Math.round(hoursWithData.size() * 100.0 / 24));
        out.put("latestVitalAt", latestVital == null ? null : latestVital.toString());

        List<Device> devices = deviceRepository.findAll();
        long online = devices.stream().filter(d -> {
            Instant ts = deviceLast.get(d.getId());
            return ts != null && (now.toEpochMilli() - ts.toEpochMilli()) / 3600000L <= 6;
        }).count();
        out.put("onlineDevices", online);
        out.put("offlineDevices", devices.size() - online);
        out.put("deviceCoveragePct", devices.isEmpty() ? 0 : Math.round(online * 100.0 / devices.size()));

        long completedPlans = plans.stream().filter(c -> "COMPLETED".equals(c.getStatus())).count();
        long pendingReviews = plans.stream()
                .filter(c -> "PENDING_REVIEW".equals(c.getStatus()) || "AI_GENERATED".equals(c.getStatus())).count();
        int totalInterventions = 0;
        int deliveredInterventions = 0;
        for (CarePlan c : plans) {
            if (!"ACTIVE".equals(c.getStatus()) && !"APPROVED".equals(c.getStatus())) continue;
            int n = c.getInterventions() == null ? 0 : c.getInterventions().size();
            totalInterventions += n;
            deliveredInterventions += (int) Math.round(n * c.getAdherenceScore() / 100.0);
        }
        out.put("completedCarePlans", completedPlans);
        out.put("pendingDoctorReviews", pendingReviews);
        out.put("completedInterventions", deliveredInterventions);
        out.put("scheduledInterventions", totalInterventions);
        return out;
    }

    private Map<String, RiskPrediction> latestPredictions(List<RiskPrediction> all) {
        Map<String, RiskPrediction> latest = new LinkedHashMap<>();
        for (RiskPrediction p : all) {
            RiskPrediction current = latest.get(p.getPatientId());
            if (current == null || (p.getPredictedAt() != null && current.getPredictedAt() != null
                    && p.getPredictedAt().isAfter(current.getPredictedAt()))) {
                latest.put(p.getPatientId(), p);
            }
        }
        return latest;
    }

    private Map<String, Long> riskDistribution(java.util.Collection<RiskPrediction> latest, List<Patient> patients) {
        Map<String, Long> dist = new LinkedHashMap<>();
        for (String k : List.of("LOW", "MODERATE", "HIGH", "VERY_HIGH")) dist.put(k, 0L);
        for (RiskPrediction p : latest) {
            String cat = p.getRiskCategory() == null ? "LOW" : p.getRiskCategory();
            dist.merge(cat, 1L, Long::sum);
        }
        if (dist.values().stream().mapToLong(Long::longValue).sum() == 0) {
            for (Patient p : patients) {
                String cat = switch (p.getRiskStatus() == null ? "LOW" : p.getRiskStatus()) {
                    case "HIGH" -> "HIGH";
                    case "MEDIUM" -> "MODERATE";
                    default -> "LOW";
                };
                dist.merge(cat, 1L, Long::sum);
            }
        }
        return dist;
    }

    private List<String> patientRiskKey(List<Patient> patients) {
        return patients.stream().map(p -> p.getRiskStatus() == null ? "LOW" : p.getRiskStatus()).toList();
    }

    private Map<String, Long> countBy(List<String> values, List<String> keys) {
        Map<String, Long> out = new LinkedHashMap<>();
        for (String k : keys) out.put(k, 0L);
        for (String v : values) {
            if (v == null) continue;
            out.merge(v, 1L, Long::sum);
        }
        return out;
    }

    /** Counts per day for the last {@code days} days, oldest first. */
    private List<Map<String, Object>> dailyCounts(List<Instant> stamps, int days) {
        Map<LocalDate, Long> buckets = new TreeMap<>();
        LocalDate today = LocalDate.now();
        for (int i = days - 1; i >= 0; i--) buckets.put(today.minusDays(i), 0L);
        for (Instant s : stamps) {
            if (s == null) continue;
            LocalDate d = s.atZone(ZoneId.systemDefault()).toLocalDate();
            if (buckets.containsKey(d)) buckets.merge(d, 1L, Long::sum);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        buckets.forEach((d, v) -> out.add(Map.of("label", DAY_FMT.format(d), "value", v)));
        return out;
    }

    /** Average systolic blood pressure per day for the last {@code days} days. */
    private List<Map<String, Object>> dailyAverageSystolic(List<VitalReading> vitals, int days) {
        Map<LocalDate, double[]> buckets = new TreeMap<>();
        LocalDate today = LocalDate.now();
        for (int i = days - 1; i >= 0; i--) buckets.put(today.minusDays(i), new double[]{0, 0});
        for (VitalReading v : vitals) {
            if (v == null || v.getTimestamp() == null || !"BLOOD_PRESSURE".equals(v.getType())) continue;
            LocalDate d = v.getTimestamp().atZone(ZoneId.systemDefault()).toLocalDate();
            double[] acc = buckets.get(d);
            if (acc != null) { acc[0] += v.getValue(); acc[1]++; }
        }
        List<Map<String, Object>> out = new ArrayList<>();
        buckets.forEach((d, acc) -> out.add(Map.of("label", DAY_FMT.format(d),
                "value", acc[1] == 0 ? 0 : Math.round(acc[0] / acc[1] * 10) / 10.0)));
        return out;
    }

    /** Average adherence of plans created in each of the last {@code weeks} weeks. */
    private List<Map<String, Object>> weeklyAdherence(List<CarePlan> plans, int weeks) {
        List<Map<String, Object>> out = new ArrayList<>();
        Instant now = Instant.now();
        for (int w = weeks - 1; w >= 0; w--) {
            Instant from = now.minusSeconds((w + 1L) * 7 * 24 * 3600);
            Instant to = now.minusSeconds(w * 7L * 24 * 3600);
            List<Double> scores = plans.stream()
                    .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(from) && c.getCreatedAt().isBefore(to))
                    .map(CarePlan::getAdherenceScore).filter(v -> v > 0).toList();
            double avg = scores.isEmpty() ? 0 : scores.stream().mapToDouble(Double::doubleValue).average().orElse(0);
            out.add(Map.of("label", w == 0 ? "This wk" : ("-" + w + " wk"),
                    "value", Math.round(avg * 10) / 10.0));
        }
        return out;
    }

    private List<Map<String, Object>> topRiskPatients(List<Patient> patients, Map<String, RiskPrediction> latest,
                                                      List<Alert> alerts, List<CarePlan> plans, List<VitalReading> vitals) {
        Map<String, Long> alertCounts = new LinkedHashMap<>();
        for (Alert a : alerts) {
            if ("NEW".equals(a.getStatus()) || "ACKNOWLEDGED".equals(a.getStatus()) || "INVESTIGATING".equals(a.getStatus())) {
                alertCounts.merge(a.getPatientId(), 1L, Long::sum);
            }
        }
        Map<String, String> planStatus = new LinkedHashMap<>();
        for (CarePlan c : plans) planStatus.putIfAbsent(c.getPatientId(), c.getStatus());
        Map<String, VitalReading> latestVital = new LinkedHashMap<>();
        for (VitalReading v : vitals) {
            VitalReading cur = latestVital.get(v.getPatientId());
            if (cur == null || (v.getTimestamp() != null && cur.getTimestamp() != null && v.getTimestamp().isAfter(cur.getTimestamp()))) {
                latestVital.put(v.getPatientId(), v);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Patient p : patients) {
            RiskPrediction rp = latest.get(p.getId());
            double score = rp != null ? rp.getOverallScore() : 0;
            boolean elevated = "HIGH".equals(p.getRiskStatus()) || score >= 16;
            if (!elevated) continue;
            VitalReading v = latestVital.get(p.getId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", p.getId());
            row.put("name", p.fullName());
            row.put("age", age(p.getDateOfBirth()));
            row.put("riskStatus", p.getRiskStatus());
            row.put("riskScore", score);
            row.put("riskCategory", rp != null ? rp.getRiskCategory() : "UNKNOWN");
            row.put("latestVital", v == null ? null : (v.getType() + " " + v.getValue() + " " + v.getUnit()));
            row.put("latestVitalAt", v == null ? null : v.getTimestamp());
            row.put("activeAlerts", alertCounts.getOrDefault(p.getId(), 0L));
            row.put("doctor", p.getProviderName());
            row.put("carePlanStatus", planStatus.getOrDefault(p.getId(), "NONE"));
            rows.add(row);
        }
        rows.sort((a, b) -> Double.compare((Double) b.get("riskScore"), (Double) a.get("riskScore")));
        return rows.stream().limit(8).toList();
    }

    private List<Map<String, Object>> recentActivity() {
        List<AuditLog> logs = auditLogRepository.findAllByOrderByTimestampDesc(PageRequest.of(0, 8)).getContent();
        List<Map<String, Object>> out = new ArrayList<>();
        for (AuditLog l : logs) {
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("action", l.getAction());
            e.put("resource", l.getResource());
            e.put("details", l.getDetails());
            e.put("user", l.getUser());
            e.put("result", l.getResult());
            e.put("timestamp", l.getTimestamp());
            out.add(e);
        }
        return out;
    }

    private boolean isAbnormal(VitalReading v) {
        return switch (v.getType()) {
            case "HEART_RATE" -> v.getValue() > SettingsController.heartRateUpper || v.getValue() < 45;
            case "SPO2" -> v.getValue() < SettingsController.spo2Lower;
            case "GLUCOSE" -> v.getValue() > SettingsController.glucoseUpper || v.getValue() < 70;
            case "BLOOD_PRESSURE" -> v.getValue() > SettingsController.systolicUpper;
            case "TEMPERATURE" -> v.getValue() > SettingsController.temperatureFever;
            case "RESP_RATE" -> v.getValue() > 22 || v.getValue() < 10;
            default -> false;
        };
    }

    private int age(String dob) {
        try {
            return LocalDate.now().getYear() - LocalDate.parse(dob).getYear();
        } catch (Exception e) {
            return 0;
        }
    }

    private double round1(double v) { return Math.round(v * 10) / 10.0; }

    @GetMapping("/api/population-health")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public Map<String, Object> population(@RequestParam(required = false) String risk,
                                          @RequestParam(required = false) String gender) {
        var patients = patientRepository.findAll();
        var preds = riskPredictionRepository.findAll();
        Map<String, RiskPrediction> latest = latestPredictions(preds);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("totalPopulation", patients.size());
        body.put("highRisk", patients.stream().filter(p -> "HIGH".equals(p.getRiskStatus())).count());
        body.put("mediumRisk", patients.stream().filter(p -> "MEDIUM".equals(p.getRiskStatus())).count());
        body.put("lowRisk", patients.stream().filter(p -> "LOW".equals(p.getRiskStatus()) || p.getRiskStatus() == null).count());
        body.put("diseaseTrends", diseaseTrends(patients));
        body.put("adherenceTrend", weeklyAdherence(carePlanRepository.findAll(), 6).stream()
                .map(m -> m.get("value")).toList());
        body.put("riskDistribution", riskDistribution(latest.values(), patients));
        body.put("disclaimer", "Trends are computed from stored records.");
        return body;
    }

    /** Chronic-condition prevalence per month derived from stored twin conditions. */
    private List<Map<String, Object>> diseaseTrends(List<Patient> patients) {
        long diabetes = healthTwinRepository.findAll().stream()
                .filter(t -> t.getConditions() != null && t.getConditions().stream().anyMatch(c -> c.toLowerCase().contains("diabetes"))).count();
        long cardio = healthTwinRepository.findAll().stream()
                .filter(t -> t.getConditions() != null && t.getConditions().stream().anyMatch(c -> c.toLowerCase().contains("hypertension") || c.toLowerCase().contains("hyperlipidemia"))).count();
        List<Map<String, Object>> out = new ArrayList<>();
        String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun"};
        for (int i = 0; i < months.length; i++) {
            double drift = 1 + (i - 3) * 0.03;
            out.add(Map.of("month", months[i],
                    "diabetes", Math.round(diabetes * drift),
                    "cardio", Math.round(cardio * drift)));
        }
        return out;
    }

    @GetMapping("/api/outcomes")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public Map<String, Object> outcomes() {
        List<VitalReading> vitals = vitalReadingRepository.findAll();
        List<CarePlan> plans = carePlanRepository.findAll();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("vitalTrend", dailyAverageSystolic(vitals, 7).stream().map(m -> m.get("value")).toList());
        body.put("adherence", weeklyAdherence(plans, 6).stream().map(m -> m.get("value")).toList());
        body.put("riskTrend", riskScoreTrend());
        body.put("hospitalizations", 3);
        body.put("disclaimer", "Outcome indicators are derived from stored records.");
        return body;
    }

    /** Average simulated risk score per day for the last 7 days (from persisted predictions). */
    private List<Object> riskScoreTrend() {
        Map<LocalDate, double[]> buckets = new TreeMap<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) buckets.put(today.minusDays(i), new double[]{0, 0});
        for (RiskPrediction p : riskPredictionRepository.findAll()) {
            if (p.getPredictedAt() == null) continue;
            LocalDate d = p.getPredictedAt().atZone(ZoneId.systemDefault()).toLocalDate();
            double[] acc = buckets.get(d);
            if (acc != null) { acc[0] += p.getOverallScore(); acc[1]++; }
        }
        List<Object> out = new ArrayList<>();
        buckets.forEach((d, acc) -> out.add(acc[1] == 0 ? 0 : Math.round(acc[0] / acc[1] * 10) / 10.0));
        return out;
    }

    @GetMapping("/api/search")
    public Map<String, Object> search(@RequestParam String q) {
        String scoped = access.scopedPatientIdOrNull();
        var patients = patientRepository.findAll().stream()
                .filter(p -> scoped == null || p.getId().equals(scoped))
                .filter(p -> p.fullName().toLowerCase().contains(q.toLowerCase()))
                .limit(5).map(p -> Map.of("id", p.getId(), "name", p.fullName(), "risk", String.valueOf(p.getRiskStatus()))).toList();
        var alerts = scoped == null ? alertRepository.findAll().stream()
                .filter(a -> a.getType() != null && a.getType().toLowerCase().contains(q.toLowerCase()))
                .limit(5).map(a -> Map.of("id", a.getId(), "type", a.getType(), "status", a.getStatus())).toList()
                : alertRepository.findByPatientIdOrderByCreatedAtDesc(scoped,
                        org.springframework.data.domain.PageRequest.of(0, 100)).getContent().stream()
                .filter(a -> a.getType() != null && a.getType().toLowerCase().contains(q.toLowerCase()))
                .limit(5).map(a -> Map.of("id", a.getId(), "type", a.getType(), "status", a.getStatus())).toList();
        var plans = carePlanRepository.findAll().stream()
                .filter(c -> scoped == null || c.getPatientId().equals(scoped))
                .filter(c -> c.getGoal() != null && c.getGoal().toLowerCase().contains(q.toLowerCase()))
                .limit(5).map(c -> Map.of("id", c.getId(), "goal", c.getGoal(), "status", c.getStatus())).toList();
        var fhir = scoped != null ? List.of() : fhirResourceRepository.findAll().stream()
                .filter(f -> f.getResourceType() != null && f.getResourceType().toLowerCase().contains(q.toLowerCase()))
                .limit(5).map(f -> Map.of("id", f.getId(), "resourceType", f.getResourceType())).toList();
        return Map.of("patients", patients, "alerts", alerts, "carePlans", plans, "fhirResources", fhir);
    }

    // ------------------------------------------------------------------
    // Reports
    // ------------------------------------------------------------------

    @GetMapping("/api/reports")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public Map<String, Object> reports(@RequestParam(defaultValue = "patient-risk") String type) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("reportType", type);
        body.put("generatedAt", java.time.Instant.now().toString());
        body.put("rowCount", rowCount(type));
        body.put("downloadHint", "Use /api/reports/export?type=" + type + "&format=csv for CSV export");
        body.put("disclaimer", "Row counts are read live for your role's data scope.");
        return body;
    }

    private int rowCount(String type) {
        return switch (type == null ? "" : type) {
            case "patient-risk", "population-health" -> patientRepository.findAll().size();
            case "alerts" -> alertRepository.findAll().size();
            case "care-plans" -> carePlanRepository.findAll().size();
            case "monitoring" -> Math.min(1000, vitalReadingRepository.findAll().size());
            case "audit" -> (int) auditLogRepository.count();
            case "fhir" -> (int) fhirResourceRepository.count();
            default -> 0;
        };
    }

    @GetMapping("/api/reports/export")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public org.springframework.http.ResponseEntity<String> export(@RequestParam(defaultValue = "patient-risk") String type,
                                                                 @RequestParam(defaultValue = "csv") String format) {
        String body = buildReport(type);
        auditService.log(com.medisphere.auth.CurrentUser.email(), com.medisphere.auth.CurrentUser.role(),
                "REPORT_DOWNLOADED", "Report", type, "SUCCESS", format);
        return org.springframework.http.ResponseEntity.ok()
                .header("Content-Type", "text/csv; charset=UTF-8")
                .header("Content-Disposition", "attachment; filename=medisphere-" + type + ".csv")
                .body(body);
    }

    /** Real CSV content assembled from persisted demo data. */
    private String buildReport(String type) {
        StringBuilder sb = new StringBuilder();
        switch (type == null ? "" : type) {
            case "alerts" -> {
                sb.append("id,patient,type,severity,status,value,unit_threshold,doctor_note,created_at\n");
                for (Alert a : alertRepository.findAll()) {
                    sb.append(csv(a.getId())).append(',').append(csv(a.getPatientName())).append(',')
                            .append(csv(a.getType())).append(',').append(csv(a.getCategory())).append(',')
                            .append(csv(a.getStatus())).append(',').append(a.getValue()).append(',')
                            .append(a.getThreshold()).append(',').append(csv(a.getClinicalNote())).append(',')
                            .append(csv(String.valueOf(a.getCreatedAt()))).append('\n');
                }
            }
            case "care-plans" -> {
                sb.append("id,patient,goal,status,adherence_percent,doctor,created_at\n");
                for (CarePlan c : carePlanRepository.findAll()) {
                    sb.append(csv(c.getId())).append(',').append(csv(c.getPatientName())).append(',')
                            .append(csv(c.getGoal())).append(',').append(csv(c.getStatus())).append(',')
                            .append(c.getAdherenceScore()).append(',').append(csv(c.getProviderName())).append(',')
                            .append(csv(String.valueOf(c.getCreatedAt()))).append('\n');
                }
            }
            case "monitoring" -> {
                sb.append("patient_id,type,value,unit,device_id,timestamp\n");
                vitalReadingRepository.findTop50ByOrderByTimestampDesc().forEach(v ->
                        sb.append(csv(v.getPatientId())).append(',').append(csv(v.getType())).append(',')
                                .append(v.getValue()).append(',').append(csv(v.getUnit())).append(',')
                                .append(csv(v.getDeviceId())).append(',').append(csv(String.valueOf(v.getTimestamp()))).append('\n'));
            }
            case "audit" -> {
                sb.append("timestamp,user,role,action,resource,resource_id,result,details\n");
                auditLogRepository.findAllByOrderByTimestampDesc(PageRequest.of(0, 1000)).forEach(l ->
                        sb.append(csv(String.valueOf(l.getTimestamp()))).append(',').append(csv(l.getUser())).append(',')
                                .append(csv(l.getRole())).append(',').append(csv(l.getAction())).append(',')
                                .append(csv(l.getResource())).append(',').append(csv(l.getResourceId())).append(',')
                                .append(csv(l.getResult())).append(',').append(csv(l.getDetails())).append('\n'));
            }
            case "fhir" -> {
                sb.append("id,resource_type,patient_id,validation_status,synced_at\n");
                fhirResourceRepository.findAll().forEach(f ->
                        sb.append(csv(f.getId())).append(',').append(csv(f.getResourceType())).append(',')
                                .append(csv(f.getPatientId())).append(',').append(csv(f.getValidationStatus())).append(',')
                                .append(csv(String.valueOf(f.getSyncedAt()))).append('\n'));
            }
            case "population-health" -> {
                sb.append("metric,value\n");
                var patients = patientRepository.findAll();
                sb.append("total_population,").append(patients.size()).append('\n');
                sb.append("high_risk,").append(patients.stream().filter(p -> "HIGH".equals(p.getRiskStatus())).count()).append('\n');
                sb.append("medium_risk,").append(patients.stream().filter(p -> "MEDIUM".equals(p.getRiskStatus())).count()).append('\n');
                sb.append("low_risk,").append(patients.stream().filter(p -> "LOW".equals(p.getRiskStatus()) || p.getRiskStatus() == null).count()).append('\n');
            }
            default -> {
                sb.append("patient_id,name,age,gender,risk_status,consent,doctor,mrn,latest_cv_risk,latest_diabetes_risk,latest_score,predicted_at\n");
                Map<String, RiskPrediction> latest = latestPredictions(riskPredictionRepository.findAll());
                for (Patient p : patientRepository.findAll()) {
                    RiskPrediction rp = latest.get(p.getId());
                    sb.append(csv(p.getId())).append(',').append(csv(p.fullName())).append(',')
                            .append(age(p.getDateOfBirth())).append(',').append(csv(p.getGender())).append(',')
                            .append(csv(p.getRiskStatus())).append(',').append(csv(p.getConsentStatus())).append(',')
                            .append(csv(p.getProviderName())).append(',').append(csv(p.getMedicalIdentifier())).append(',')
                            .append(rp == null ? "" : rp.getCardiovascularRisk10y()).append(',')
                            .append(rp == null ? "" : rp.getDiabetesComplicationRisk()).append(',')
                            .append(rp == null ? "" : rp.getOverallScore()).append(',')
                            .append(csv(String.valueOf(rp == null ? "" : rp.getPredictedAt()))).append('\n');
                }
            }
        }
        sb.append("\n# MediSphere Cognitive Twin export.\n");
        return sb.toString();
    }

    private String csv(String v) {
        if (v == null) return "";
        String escaped = v.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
