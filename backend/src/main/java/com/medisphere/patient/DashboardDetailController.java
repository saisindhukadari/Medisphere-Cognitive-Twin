package com.medisphere.patient;

import com.medisphere.alerts.Alert;
import com.medisphere.alerts.AlertRepository;
import com.medisphere.auth.AccessControlService;
import com.medisphere.careplan.CarePlan;
import com.medisphere.careplan.CarePlanRepository;
import com.medisphere.consent.Consent;
import com.medisphere.consent.ConsentRepository;
import com.medisphere.healthtwin.HealthTwin;
import com.medisphere.healthtwin.HealthTwinRepository;
import com.medisphere.monitoring.Device;
import com.medisphere.monitoring.DeviceRepository;
import com.medisphere.risk.RiskPrediction;
import com.medisphere.risk.RiskPredictionRepository;
import com.medisphere.vitals.SettingsController;
import com.medisphere.vitals.VitalReading;
import com.medisphere.vitals.VitalReadingRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Detail endpoints behind the dashboard's interactive widgets: animated vital
 * trends, the live-vitals panel, the wearable fleet, the clickable circular
 * progress rings and the patient watchlist used by the dashboard filters.
 *
 * <p>Everything here is computed from persisted MongoDB records (seeded
 * synthetic data plus the deterministic simulation service) — no values are
 * invented in the browser.</p>
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardDetailController {
    private static final DateTimeFormatter HOUR_LABEL = DateTimeFormatter.ofPattern("HH:00");
    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("EEE d");

    private final VitalReadingRepository vitalReadingRepository;
    private final PatientRepository patientRepository;
    private final DeviceRepository deviceRepository;
    private final RiskPredictionRepository riskPredictionRepository;
    private final CarePlanRepository carePlanRepository;
    private final AlertRepository alertRepository;
    private final ConsentRepository consentRepository;
    private final HealthTwinRepository healthTwinRepository;
    private final AccessControlService access;

    public DashboardDetailController(VitalReadingRepository vitalReadingRepository,
                                     PatientRepository patientRepository,
                                     DeviceRepository deviceRepository,
                                     RiskPredictionRepository riskPredictionRepository,
                                     CarePlanRepository carePlanRepository,
                                     AlertRepository alertRepository,
                                     ConsentRepository consentRepository,
                                     HealthTwinRepository healthTwinRepository,
                                     AccessControlService access) {
        this.vitalReadingRepository = vitalReadingRepository;
        this.patientRepository = patientRepository;
        this.deviceRepository = deviceRepository;
        this.riskPredictionRepository = riskPredictionRepository;
        this.carePlanRepository = carePlanRepository;
        this.alertRepository = alertRepository;
        this.consentRepository = consentRepository;
        this.healthTwinRepository = healthTwinRepository;
        this.access = access;
    }

    // ------------------------------------------------------------------
    // GET /api/dashboard/vitals-trend?metric=HEART_RATE&range=24h|7d|30d
    // ------------------------------------------------------------------
    @GetMapping("/vitals-trend")
    public Map<String, Object> vitalsTrend(@RequestParam(defaultValue = "HEART_RATE") String metric,
                                           @RequestParam(defaultValue = "7d") String range) {
        String scoped = access.scopedPatientIdOrNull();
        int hours = switch (range) {
            case "24h" -> 24;
            case "30d" -> 24 * 30;
            default -> 24 * 7;
        };
        Instant from = Instant.now().minusSeconds(hours * 3600L);
        boolean hourly = hours <= 24;

        List<VitalReading> rows = vitalReadingRepository.findByTimestampGreaterThanEqual(from).stream()
                .filter(v -> metric.equals(v.getType()))
                .filter(v -> scoped == null || scoped.equals(v.getPatientId()))
                .toList();

        ZoneId zone = ZoneId.systemDefault();
        LocalDateTime nowLdt = LocalDateTime.now(zone);
        LocalDateTime startLdt = hourly
                ? nowLdt.minusHours(hours - 1).withMinute(0).withSecond(0).withNano(0)
                : nowLdt.minusDays((hours / 24) - 1);

        // bucket start -> accumulator
        Map<LocalDateTime, double[]> buckets = new LinkedHashMap<>();
        Map<LocalDateTime, Integer> counts = new LinkedHashMap<>();
        List<LocalDateTime> order = new ArrayList<>();
        LocalDateTime cursor = startLdt;
        int bucketCount = hourly ? hours : (hours / 24);
        for (int i = 0; i < bucketCount; i++) {
            LocalDateTime key = hourly ? cursor.withMinute(0).withSecond(0).withNano(0) : cursor.toLocalDate().atStartOfDay();
            if (!buckets.containsKey(key)) {
                buckets.put(key, new double[]{0, 0});
                counts.put(key, 0);
                order.add(key);
            }
            cursor = hourly ? cursor.plusHours(1) : cursor.plusDays(1);
        }

        double min = Double.MAX_VALUE;
        double max = -Double.MAX_VALUE;
        double sum = 0;
        for (VitalReading v : rows) {
            if (v.getTimestamp() == null) continue;
            LocalDateTime ldt = LocalDateTime.ofInstant(v.getTimestamp(), zone);
            LocalDateTime key = hourly ? ldt.withMinute(0).withSecond(0).withNano(0) : ldt.toLocalDate().atStartOfDay();
            double[] acc = buckets.get(key);
            if (acc == null) {
                acc = new double[]{0, 0};
                buckets.put(key, acc);
                counts.put(key, 0);
                order.add(key);
            }
            acc[0] += v.getValue();
            acc[1]++;
            counts.put(key, counts.get(key) + 1);
            min = Math.min(min, v.getValue());
            max = Math.max(max, v.getValue());
            sum += v.getValue();
        }

        List<Map<String, Object>> points = new ArrayList<>();
        for (LocalDateTime key : order) {
            double[] acc = buckets.get(key);
            int n = counts.get(key);
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("label", hourly ? key.format(HOUR_LABEL) : key.format(DAY_LABEL));
            p.put("at", key.atZone(zone).toInstant().toString());
            p.put("count", n);
            p.put("value", n == 0 ? null : round1(acc[0] / n));
            points.add(p);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("metric", metric);
        body.put("label", METRIC_LABELS.getOrDefault(metric, metric));
        body.put("unit", METRIC_UNITS.getOrDefault(metric, ""));
        body.put("range", range);
        body.put("hourly", hourly);
        body.put("points", points);
        body.put("sampleCount", rows.size());
        body.put("min", rows.isEmpty() ? null : round1(min));
        body.put("max", rows.isEmpty() ? null : round1(max));
        body.put("avg", rows.isEmpty() ? null : round1(sum / rows.size()));
        body.put("updatedAt", Instant.now().toString());
        body.put("simulated", true);
        body.put("disclaimer", "Readings are pulled from the platform's vitals store for your role's scope.");
        return body;
    }

    private static final Map<String, String> METRIC_LABELS = Map.ofEntries(
            Map.entry("HEART_RATE", "Heart rate"),
            Map.entry("BLOOD_PRESSURE", "Systolic BP"),
            Map.entry("SPO2", "Blood oxygen"),
            Map.entry("GLUCOSE", "Glucose"),
            Map.entry("TEMPERATURE", "Temperature"),
            Map.entry("RESP_RATE", "Respiratory rate"),
            Map.entry("STEPS", "Steps"));

    private static final Map<String, String> METRIC_UNITS = Map.ofEntries(
            Map.entry("HEART_RATE", "bpm"),
            Map.entry("BLOOD_PRESSURE", "mmHg"),
            Map.entry("SPO2", "%"),
            Map.entry("GLUCOSE", "mg/dL"),
            Map.entry("TEMPERATURE", "°C"),
            Map.entry("RESP_RATE", "/min"),
            Map.entry("STEPS", "steps"));

    // ------------------------------------------------------------------
    // GET /api/dashboard/vitals-latest — live vitals panel
    // ------------------------------------------------------------------
    @GetMapping("/vitals-latest")
    public Map<String, Object> vitalsLatest() {
        String scoped = access.scopedPatientIdOrNull();
        Instant dayAgo = Instant.now().minusSeconds(24 * 3600L);
        List<VitalReading> window = vitalReadingRepository.findByTimestampGreaterThanEqual(dayAgo).stream()
                .filter(v -> scoped == null || scoped.equals(v.getPatientId()))
                .toList();

        Map<String, String> names = patientNames();
        String[] metrics = {"HEART_RATE", "BLOOD_PRESSURE", "SPO2", "GLUCOSE", "TEMPERATURE", "RESP_RATE"};
        List<Map<String, Object>> vitals = new ArrayList<>();
        for (String metric : metrics) {
            List<VitalReading> forMetric = vitalReadingRepository.findTop12ByTypeOrderByTimestampDesc(metric).stream()
                    .filter(v -> scoped == null || scoped.equals(v.getPatientId()))
                    .toList();
            if (forMetric.isEmpty()) continue;

            VitalReading latest = forMetric.get(0);
            List<Double> spark = forMetric.stream()
                    .sorted(Comparator.comparing(VitalReading::getTimestamp))
                    .map(VitalReading::getValue)
                    .toList();
            List<VitalReading> last24 = window.stream().filter(v -> metric.equals(v.getType())).toList();

            Map<String, Object> v = new LinkedHashMap<>();
            v.put("type", metric);
            v.put("label", METRIC_LABELS.getOrDefault(metric, metric));
            v.put("unit", METRIC_UNITS.getOrDefault(metric, metric));
            v.put("value", round1(latest.getValue()));
            v.put("at", latest.getTimestamp() == null ? null : latest.getTimestamp().toString());
            v.put("patientId", latest.getPatientId());
            v.put("patientName", names.getOrDefault(latest.getPatientId(), "Synthetic patient"));
            v.put("abnormal", isAbnormal(latest));
            v.put("threshold", thresholdText(metric));
            v.put("readings24h", last24.size());
            v.put("avg24h", last24.isEmpty() ? null
                    : round1(last24.stream().mapToDouble(VitalReading::getValue).average().orElse(0)));
            v.put("spark", spark);
            vitals.add(v);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("vitals", vitals);
        body.put("patientsStreaming", window.stream().map(VitalReading::getPatientId).distinct().count());
        body.put("readingsLastHour", window.stream()
                .filter(v -> v.getTimestamp() != null && v.getTimestamp().isAfter(Instant.now().minusSeconds(3600)))
                .count());
        body.put("updatedAt", Instant.now().toString());
        body.put("simulated", true);
        body.put("disclaimer", "Values refresh on the configured polling interval.");
        return body;
    }

    private String thresholdText(String metric) {
        return switch (metric) {
            case "HEART_RATE" -> "< " + (int) SettingsController.heartRateUpper + " bpm";
            case "SPO2" -> "≥ " + (int) SettingsController.spo2Lower + "%";
            case "GLUCOSE" -> "< " + (int) SettingsController.glucoseUpper + " mg/dL";
            case "BLOOD_PRESSURE" -> "< " + (int) SettingsController.systolicUpper + " mmHg";
            case "TEMPERATURE" -> "< " + SettingsController.temperatureFever + " °C";
            case "RESP_RATE" -> "< 22 /min";
            default -> "within configured demo threshold";
        };
    }

    private boolean isAbnormal(VitalReading v) {
        if (v == null || v.getType() == null) return false;
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

    // ------------------------------------------------------------------
    // GET /api/dashboard/wearables — simulated device fleet
    // ------------------------------------------------------------------
    @GetMapping("/wearables")
    public Map<String, Object> wearables() {
        String scoped = access.scopedPatientIdOrNull();
        List<Device> devices = deviceRepository.findAll().stream()
                .filter(d -> scoped == null || scoped.equals(d.getPatientId()))
                .toList();
        Map<String, String> names = patientNames();

        // Latest reading per device (window covers seeded history + simulation stream)
        Instant window = Instant.now().minusSeconds(30L * 24 * 3600);
        Map<String, VitalReading> latestByDevice = new LinkedHashMap<>();
        Map<String, VitalReading> latestByPatientMetric = new LinkedHashMap<>();
        for (VitalReading v : vitalReadingRepository.findByTimestampGreaterThanEqual(window)) {
            if (v.getTimestamp() == null) continue;
            if (v.getDeviceId() != null) {
                VitalReading cur = latestByDevice.get(v.getDeviceId());
                if (cur == null || v.getTimestamp().isAfter(cur.getTimestamp())) latestByDevice.put(v.getDeviceId(), v);
            }
            String key = v.getPatientId() + "|" + v.getType();
            VitalReading cur = latestByPatientMetric.get(key);
            if (cur == null || v.getTimestamp().isAfter(cur.getTimestamp())) latestByPatientMetric.put(key, v);
        }

        Instant now = Instant.now();
        List<Map<String, Object>> rows = new ArrayList<>();
        int online = 0, idle = 0, offline = 0;
        long batterySum = 0;
        int batteryN = 0;
        Instant lastSync = null;

        for (Device d : devices) {
            VitalReading latest = latestByDevice.get(d.getId());
            if (latest == null && d.getMetric() != null) {
                latest = latestByPatientMetric.get(d.getPatientId() + "|" + d.getMetric());
            }
            Instant sync = latest != null ? latest.getTimestamp() : parseInstant(d.getLastSeen());
            long ageHours = sync == null ? Long.MAX_VALUE : Math.max(0, (now.toEpochMilli() - sync.toEpochMilli()) / 3600000L);
            String status = sync == null ? "OFFLINE" : ageHours <= 6 ? "ONLINE" : ageHours <= 48 ? "IDLE" : "OFFLINE";
            if ("ONLINE".equals(status)) online++;
            else if ("IDLE".equals(status)) idle++;
            else offline++;
            if (d.getBatteryPercent() != null) {
                batterySum += d.getBatteryPercent();
                batteryN++;
            }
            if (sync != null && (lastSync == null || sync.isAfter(lastSync))) lastSync = sync;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", d.getId());
            row.put("patientId", d.getPatientId());
            row.put("patientName", d.getPatientName() != null ? d.getPatientName()
                    : names.getOrDefault(d.getPatientId(), "Synthetic patient"));
            row.put("type", d.getType());
            row.put("name", d.getName() != null ? d.getName() : "Wearable device");
            row.put("model", d.getModelName());
            row.put("firmware", d.getFirmware());
            row.put("battery", d.getBatteryPercent());
            row.put("signal", d.getSignal());
            row.put("metric", d.getMetric());
            row.put("metricLabel", METRIC_LABELS.getOrDefault(d.getMetric(), d.getMetric()));
            row.put("status", status);
            row.put("online", "ONLINE".equals(status));
            row.put("lastSync", sync == null ? null : sync.toString());
            row.put("hoursSinceSync", sync == null ? null : ageHours);
            if (latest != null) {
                Map<String, Object> reading = new LinkedHashMap<>();
                reading.put("type", latest.getType());
                reading.put("label", METRIC_LABELS.getOrDefault(latest.getType(), latest.getType()));
                reading.put("value", round1(latest.getValue()));
                reading.put("unit", latest.getUnit() != null ? latest.getUnit() : METRIC_UNITS.getOrDefault(latest.getType(), ""));
                reading.put("at", latest.getTimestamp().toString());
                reading.put("abnormal", isAbnormal(latest));
                row.put("latest", reading);
            } else {
                row.put("latest", null);
            }
            row.put("simulated", true);
            rows.add(row);
        }

        rows.sort(Comparator.comparing((Map<String, Object> r) -> String.valueOf(r.get("status")))
                .thenComparing(r -> String.valueOf(r.get("lastSync") == null ? "" : r.get("lastSync")), Comparator.reverseOrder()));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("devices", devices.size());
        summary.put("online", online);
        summary.put("idle", idle);
        summary.put("offline", offline);
        summary.put("avgBattery", batteryN == 0 ? 0 : Math.round((double) batterySum / batteryN));
        summary.put("coveragePct", devices.isEmpty() ? 0 : Math.round(online * 100.0 / devices.size()));
        summary.put("patientsMonitored", rows.stream().map(r -> r.get("patientId")).distinct().count());
        summary.put("lastSyncAt", lastSync == null ? null : lastSync.toString());
        summary.put("totalPatients", scoped == null ? patientRepository.count() : 1);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("summary", summary);
        body.put("devices", rows);
        body.put("mode", "SIMULATED");
        body.put("simulated", true);
        body.put("updatedAt", Instant.now().toString());
        body.put("disclaimer",
                "Device rows combine the paired-device registry with the most recent reading per device.");
        return body;
    }

    // ------------------------------------------------------------------
    // GET /api/dashboard/rings — data behind every clickable progress ring
    // ------------------------------------------------------------------
    @GetMapping("/rings")
    public Map<String, Object> rings() {
        String scoped = access.scopedPatientIdOrNull();
        List<Patient> patients = patientRepository.findAll().stream()
                .filter(p -> scoped == null || scoped.equals(p.getId()))
                .toList();
        List<RiskPrediction> predictions = riskPredictionRepository.findAll().stream()
                .filter(p -> scoped == null || scoped.equals(p.getPatientId()))
                .toList();
        List<CarePlan> plans = carePlanRepository.findAll().stream()
                .filter(p -> scoped == null || scoped.equals(p.getPatientId()))
                .toList();
        List<Device> devices = deviceRepository.findAll().stream()
                .filter(d -> scoped == null || scoped.equals(d.getPatientId()))
                .toList();
        List<Consent> consents = consentRepository.findAll().stream()
                .filter(c -> scoped == null || scoped.equals(c.getPatientId()))
                .toList();
        List<HealthTwin> twins = healthTwinRepository.findAll().stream()
                .filter(t -> scoped == null || scoped.equals(t.getPatientId()))
                .toList();
        Instant window7d = Instant.now().minusSeconds(7L * 24 * 3600);
        Instant window48h = Instant.now().minusSeconds(48L * 3600);
        Instant window24h = Instant.now().minusSeconds(24L * 3600);
        List<VitalReading> vitals7d = vitalReadingRepository.findByTimestampGreaterThanEqual(window7d).stream()
                .filter(v -> scoped == null || scoped.equals(v.getPatientId()))
                .toList();

        Map<String, String> names = patientNames();
        Map<String, RiskPrediction> latestByPatient = latestPredictions(predictions);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("risk", riskRing(patients, latestByPatient, predictions, names));
        body.put("adherence", adherenceRing(plans, names));
        body.put("monitoring", monitoringRing(patients, devices, vitals7d, names));
        body.put("preventive", preventiveRing(patients, latestByPatient, consents, twins, plans, vitals7d));
        body.put("connectivity", connectivityRing(devices, names));
        body.put("updatedAt", Instant.now().toString());
        body.put("simulated", true);
        body.put("disclaimer", "Values are aggregated from stored records.");
        return body;
    }

    private Map<String, Object> riskRing(List<Patient> patients, Map<String, RiskPrediction> latest,
                                         List<RiskPrediction> predictions, Map<String, String> names) {
        int low = 0, medium = 0, high = 0;
        int pastHigh = 0;
        List<Map<String, Object>> top = new ArrayList<>();
        Instant weekAgo = Instant.now().minusSeconds(7L * 24 * 3600);

        for (Patient p : patients) {
            RiskPrediction rp = latest.get(p.getId());
            String bin = rp == null ? "LOW"
                    : rp.getOverallScore() < 8 ? "LOW"
                    : rp.getOverallScore() < 16 ? "MEDIUM" : "HIGH";
            switch (bin) {
                case "MEDIUM" -> medium++;
                case "HIGH" -> high++;
                default -> low++;
            }
            if (rp != null) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", p.getId());
                row.put("name", p.fullName());
                row.put("score", round1(rp.getOverallScore()));
                row.put("category", rp.getRiskCategory());
                row.put("trend", rp.getTrend());
                row.put("driver", topContributor(rp));
                top.add(row);
            }
        }
        // Same cohort one week earlier, from the stored prediction history.
        Instant older = Instant.now().minusSeconds(9L * 24 * 3600);
        Map<String, Double> pastScores = new LinkedHashMap<>();
        Map<String, Instant> pastAt = new LinkedHashMap<>();
        for (RiskPrediction rp : predictions) {
            if (rp.getPredictedAt() == null) continue;
            if (rp.getPredictedAt().isAfter(weekAgo) || rp.getPredictedAt().isBefore(older)) continue;
            Instant seen = pastAt.get(rp.getPatientId());
            if (seen == null || rp.getPredictedAt().isAfter(seen)) {
                pastAt.put(rp.getPatientId(), rp.getPredictedAt());
                pastScores.put(rp.getPatientId(), rp.getOverallScore());
            }
        }
        pastHigh = (int) pastScores.values().stream().filter(s -> s >= 16).count();

        top.sort((a, b) -> Double.compare(Double.parseDouble(String.valueOf(b.get("score"))),
                Double.parseDouble(String.valueOf(a.get("score")))));

        int total = Math.max(1, patients.size());
        Map<String, Object> ring = new LinkedHashMap<>();
        ring.put("pct", Math.round(high * 100.0 / total));
        ring.put("center", high + "/" + patients.size());
        ring.put("caption", "high risk");
        ring.put("segments", List.of(
                segment("Low risk", low, "var(--success)"),
                segment("Medium risk", medium, "var(--warning)"),
                segment("High risk", high, "var(--danger)")));
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("counts", Map.of("LOW", low, "MEDIUM", medium, "HIGH", high));
        detail.put("pcts", Map.of(
                "LOW", Math.round(low * 100.0 / total),
                "MEDIUM", Math.round(medium * 100.0 / total),
                "HIGH", Math.round(high * 100.0 / total)));
        detail.put("pastHigh", pastHigh);
        detail.put("delta", high - pastHigh);
        detail.put("trend", high > pastHigh ? "RISING" : high < pastHigh ? "IMPROVING" : "STABLE");
        detail.put("patients", top.stream().limit(8).toList());
        detail.put("action", "/patients");
        detail.put("actionLabel", "View patients");
        detail.put("methodology",
                "Binned from each patient's latest stored prediction score (<8 low, 8-15 medium, ≥16 high).");
        ring.put("detail", detail);
        return ring;
    }

    private Map<String, Object> adherenceRing(List<CarePlan> plans, Map<String, String> names) {
        List<CarePlan> tracked = plans.stream().filter(c -> c.getAdherenceScore() > 0).toList();
        List<CarePlan> active = plans.stream()
                .filter(c -> "ACTIVE".equals(c.getStatus()) || "APPROVED".equals(c.getStatus()))
                .toList();
        double avg = tracked.isEmpty() ? 0
                : tracked.stream().mapToDouble(CarePlan::getAdherenceScore).average().orElse(0);

        int scheduled = 0, completed = 0, pending = 0;
        for (CarePlan c : active) {
            int activities = c.getGoals().size() + c.getInterventions().size();
            int done = (int) Math.round(activities * c.getAdherenceScore() / 100.0);
            scheduled += activities;
            completed += done;
        }
        for (CarePlan c : plans) {
            if ("AI_GENERATED".equals(c.getStatus()) || "PENDING_REVIEW".equals(c.getStatus())) {
                pending += c.getGoals().size() + c.getInterventions().size();
            }
        }
        int missed = Math.max(0, scheduled - completed);
        int onTrack = (int) active.stream().filter(c -> c.getAdherenceScore() >= 85).count();

        List<Map<String, Object>> breakdown = tracked.stream()
                .sorted((a, b) -> Double.compare(b.getAdherenceScore(), a.getAdherenceScore()))
                .map(c -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("planId", c.getId());
                    row.put("patientId", c.getPatientId());
                    row.put("patientName", c.getPatientName() != null ? c.getPatientName()
                            : names.getOrDefault(c.getPatientId(), "Synthetic patient"));
                    row.put("status", c.getStatus());
                    row.put("adherence", Math.round(c.getAdherenceScore()));
                    return row;
                })
                .toList();

        Map<String, Object> ring = new LinkedHashMap<>();
        ring.put("pct", Math.round(avg));
        ring.put("center", Math.round(avg) + "%");
        ring.put("caption", "adherence");
        ring.put("segments", List.of(
                segment("Completed", completed, "var(--accent)"),
                segment("Missed", missed, "var(--warning)"),
                segment("Pending activation", pending, "var(--muted)")));
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("overallAdherence", round1(avg));
        detail.put("targetAdherence", 85);
        detail.put("activePlans", active.size());
        detail.put("onTrack", onTrack);
        detail.put("behind", Math.max(0, active.size() - onTrack));
        detail.put("completedActivities", completed);
        detail.put("missedActivities", missed);
        detail.put("pendingActivities", pending);
        detail.put("patientBreakdown", breakdown);
        detail.put("action", "/care-plans");
        detail.put("actionLabel", "View care plans");
        detail.put("methodology",
                "Activity counts are derived from each plan's stored goals, interventions and adherenceScore.");
        ring.put("detail", detail);
        return ring;
    }

    private Map<String, Object> monitoringRing(List<Patient> patients, List<Device> devices,
                                               List<VitalReading> vitals7d, Map<String, String> names) {
        Set<String> transmitting = vitals7d.stream().map(VitalReading::getPatientId).collect(Collectors.toSet());
        Set<String> connected = devices.stream()
                .filter(d -> vitals7d.stream().anyMatch(v -> d.getId().equals(v.getDeviceId())))
                .map(Device::getPatientId)
                .collect(Collectors.toSet());

        Instant sync = vitals7d.stream()
                .map(VitalReading::getTimestamp)
                .filter(t -> t != null)
                .max(Comparator.naturalOrder())
                .orElse(null);

        List<Map<String, Object>> withoutRecent = patients.stream()
                .filter(p -> !transmitting.contains(p.getId()))
                .map(p -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", p.getId());
                    row.put("name", p.fullName());
                    row.put("riskStatus", p.getRiskStatus());
                    return row;
                })
                .limit(10)
                .toList();

        int total = Math.max(1, patients.size());
        Map<String, Object> ring = new LinkedHashMap<>();
        ring.put("pct", Math.round(transmitting.size() * 100.0 / total));
        ring.put("center", Math.round(transmitting.size() * 100.0 / total) + "%");
        ring.put("caption", "coverage");
        ring.put("segments", List.of(
                segment("Transmitting", transmitting.size(), "var(--accent)"),
                segment("Silent", Math.max(0, patients.size() - transmitting.size()), "var(--muted)")));
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("monitoredPatients", transmitting.size());
        detail.put("totalPatients", patients.size());
        detail.put("connectedDevices", connected.size());
        detail.put("offlineDevices", Math.max(0, devices.size()
                - devices.stream().filter(d -> vitals7d.stream().anyMatch(v -> d.getId().equals(v.getDeviceId()))).count()));
        detail.put("lastSyncAt", sync == null ? null : sync.toString());
        detail.put("withoutRecentData", withoutRecent);
        detail.put("action", "/monitoring");
        detail.put("actionLabel", "Open monitoring");
        detail.put("methodology",
                "Coverage = patients with at least one vital reading in the last 7 days, derived from stored timestamps.");
        ring.put("detail", detail);
        return ring;
    }

    private Map<String, Object> preventiveRing(List<Patient> patients, Map<String, RiskPrediction> latest,
                                               List<Consent> consents, List<HealthTwin> twins,
                                               List<CarePlan> plans, List<VitalReading> vitals7d) {
        Set<String> consented = consents.stream()
                .filter(c -> "GRANTED".equals(c.getStatus()))
                .map(Consent::getPatientId)
                .collect(Collectors.toSet());
        Set<String> withTwin = twins.stream().map(HealthTwin::getPatientId).collect(Collectors.toSet());
        Set<String> withPlan = plans.stream().map(CarePlan::getPatientId).collect(Collectors.toSet());
        Set<String> monitored = vitals7d.stream().map(VitalReading::getPatientId).collect(Collectors.toSet());

        int done = 0;
        int total = 0;
        int cScreen = 0, cConsent = 0, cTwin = 0, cPlan = 0, cMonitor = 0;
        for (Patient p : patients) {
            boolean screen = latest.containsKey(p.getId());
            boolean consent = consented.contains(p.getId());
            boolean twin = withTwin.contains(p.getId());
            boolean plan = withPlan.contains(p.getId());
            boolean monitor = monitored.contains(p.getId());
            if (screen) cScreen++;
            if (consent) cConsent++;
            if (twin) cTwin++;
            if (plan) cPlan++;
            if (monitor) cMonitor++;
            total += 5;
            done += (screen ? 1 : 0) + (consent ? 1 : 0) + (twin ? 1 : 0) + (plan ? 1 : 0) + (monitor ? 1 : 0);
        }
        int pct = total == 0 ? 0 : (int) Math.round(done * 100.0 / total);

        Map<String, Object> ring = new LinkedHashMap<>();
        ring.put("pct", pct);
        ring.put("center", pct + "%");
        ring.put("caption", "preventive");
        ring.put("segments", List.of(
                segment("Completed", done, "var(--accent)"),
                segment("Outstanding", Math.max(0, total - done), "var(--surface-alt)")));
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("completed", done);
        detail.put("outstanding", Math.max(0, total - done));
        detail.put("activities", List.of(
                activity("Risk screening completed", cScreen, patients.size()),
                activity("Consent on file", cConsent, patients.size()),
                activity("Digital twin established", cTwin, patients.size()),
                activity("Care plan documented", cPlan, patients.size()),
                activity("Wearable monitoring active", cMonitor, patients.size())));
        detail.put("action", "/reports");
        detail.put("actionLabel", "Open reports");
        detail.put("methodology",
                "Five preventive checklist items per patient, each derived from persisted records "
                        + "(predictions, consents, twins, care plans, vitals).");
        ring.put("detail", detail);
        return ring;
    }

    private Map<String, Object> connectivityRing(List<Device> devices, Map<String, String> names) {
        Instant now = Instant.now();
        int online = 0, idle = 0, offline = 0;
        Map<String, int[]> byType = new LinkedHashMap<>();
        long batterySum = 0;
        int batteryN = 0;
        for (Device d : devices) {
            Instant sync = parseInstant(d.getLastSeen());
            long ageHours = sync == null ? Long.MAX_VALUE
                    : Math.max(0, (now.toEpochMilli() - sync.toEpochMilli()) / 3600000L);
            String status = sync == null ? "OFFLINE" : ageHours <= 6 ? "ONLINE" : ageHours <= 48 ? "IDLE" : "OFFLINE";
            if ("ONLINE".equals(status)) online++;
            else if ("IDLE".equals(status)) idle++;
            else offline++;
            byType.computeIfAbsent(d.getType() == null ? "DEVICE" : d.getType(), k -> new int[2])[0]++;
            if ("ONLINE".equals(status)) byType.get(d.getType() == null ? "DEVICE" : d.getType())[1]++;
            if (d.getBatteryPercent() != null) {
                batterySum += d.getBatteryPercent();
                batteryN++;
            }
        }
        int pct = devices.isEmpty() ? 0 : (int) Math.round(online * 100.0 / devices.size());
        List<Map<String, Object>> types = new ArrayList<>();
        byType.forEach((type, v) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("type", type);
            row.put("label", DEVICE_LABELS.getOrDefault(type, type));
            row.put("count", v[0]);
            row.put("online", v[1]);
            row.put("pct", v[0] == 0 ? 0 : Math.round(v[1] * 100.0 / v[0]));
            types.add(row);
        });

        Map<String, Object> ring = new LinkedHashMap<>();
        ring.put("pct", pct);
        ring.put("center", pct + "%");
        ring.put("caption", "connected");
        ring.put("segments", List.of(
                segment("Online", online, "var(--success)"),
                segment("Idle", idle, "var(--warning)"),
                segment("Offline", offline, "var(--danger)")));
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("online", online);
        detail.put("idle", idle);
        detail.put("offline", offline);
        detail.put("total", devices.size());
        detail.put("avgBattery", batteryN == 0 ? 0 : Math.round((double) batterySum / batteryN));
        detail.put("byType", types);
        detail.put("action", "/monitoring");
        detail.put("actionLabel", "Open monitoring");
        detail.put("methodology",
                "Connection state is derived from the age of each device's most recent stored reading "
                        + "(≤6h online, ≤48h idle, older offline). All devices are simulated.");
        ring.put("detail", detail);
        return ring;
    }

    private static final Map<String, String> DEVICE_LABELS = Map.of(
            "WEARABLE_WATCH", "Smartwatch",
            "FITNESS_TRACKER", "Fitness tracker",
            "BP_CUFF", "Blood pressure monitor",
            "PULSE_OXIMETER", "Pulse oximeter",
            "GLUCOSE_MONITOR", "Glucose monitor");

    // ------------------------------------------------------------------
    // GET /api/dashboard/watchlist?group=high|medium|low|all
    // ------------------------------------------------------------------
    @GetMapping("/watchlist")
    public Map<String, Object> watchlist(@RequestParam(defaultValue = "high") String group,
                                         @RequestParam(defaultValue = "8") int limit) {
        String scoped = access.scopedPatientIdOrNull();
        List<Patient> patients = patientRepository.findAll().stream()
                .filter(p -> scoped == null || scoped.equals(p.getId()))
                .toList();
        Map<String, RiskPrediction> latest = latestPredictions(riskPredictionRepository.findAll());

        Instant day2 = Instant.now().minusSeconds(2L * 24 * 3600);
        Map<String, VitalReading> latestVital = new LinkedHashMap<>();
        for (VitalReading v : vitalReadingRepository.findByTimestampGreaterThanEqual(day2)) {
            VitalReading cur = latestVital.get(v.getPatientId());
            if (cur == null || (v.getTimestamp() != null && cur.getTimestamp() != null
                    && v.getTimestamp().isAfter(cur.getTimestamp()))) {
                latestVital.put(v.getPatientId(), v);
            }
        }
        Map<String, Long> alertCounts = new LinkedHashMap<>();
        for (Alert a : alertRepository.findAll()) {
            if ("NEW".equals(a.getStatus()) || "ACKNOWLEDGED".equals(a.getStatus()) || "INVESTIGATING".equals(a.getStatus())) {
                alertCounts.merge(a.getPatientId(), 1L, Long::sum);
            }
        }
        Map<String, String> planStatus = new LinkedHashMap<>();
        for (CarePlan c : carePlanRepository.findAll()) planStatus.putIfAbsent(c.getPatientId(), c.getStatus());

        String wanted = group == null ? "high" : group.trim().toLowerCase();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Patient p : patients) {
            RiskPrediction rp = latest.get(p.getId());
            double score = rp != null ? rp.getOverallScore() : 0;
            String risk = p.getRiskStatus() == null ? "LOW" : p.getRiskStatus();
            boolean matches = switch (wanted) {
                case "all" -> true;
                case "medium" -> "MEDIUM".equalsIgnoreCase(risk);
                case "low" -> "LOW".equalsIgnoreCase(risk);
                default -> "HIGH".equalsIgnoreCase(risk) || score >= 16;
            };
            if (!matches) continue;

            VitalReading v = latestVital.get(p.getId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", p.getId());
            row.put("name", p.fullName());
            row.put("age", age(p.getDateOfBirth()));
            row.put("riskStatus", risk);
            row.put("riskScore", round1(score));
            row.put("riskCategory", rp == null ? "UNKNOWN" : rp.getRiskCategory());
            row.put("riskFactor", rp == null ? "—" : topContributor(rp));
            row.put("latestVital", v == null ? null : (v.getType() + " " + round1(v.getValue()) + " " + v.getUnit()));
            row.put("latestVitalAt", v == null || v.getTimestamp() == null ? null : v.getTimestamp().toString());
            row.put("monitoring", v == null ? "OFFLINE" : "ONLINE");
            row.put("activeAlerts", alertCounts.getOrDefault(p.getId(), 0L));
            row.put("carePlanStatus", planStatus.getOrDefault(p.getId(), "NONE"));
            row.put("doctor", p.getProviderName());
            row.put("updatedAt", p.getUpdatedAt() == null ? null : p.getUpdatedAt().toString());
            rows.add(row);
        }
        rows.sort((a, b) -> Double.compare(Double.parseDouble(String.valueOf(b.get("riskScore"))),
                Double.parseDouble(String.valueOf(a.get("riskScore")))));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("group", wanted);
        body.put("total", rows.size());
        body.put("patients", rows.stream().limit(Math.max(1, limit)).toList());
        body.put("updatedAt", Instant.now().toString());
        body.put("disclaimer", "Risk scores are computed by the platform's risk model.");
        return body;
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------
    private Map<String, String> patientNames() {
        return patientRepository.findAll().stream()
                .collect(Collectors.toMap(Patient::getId, Patient::fullName, (a, b) -> a));
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

    private String topContributor(RiskPrediction rp) {
        return rp.getContributions() == null ? "—"
                : rp.getContributions().stream()
                .filter(c -> "INCREASES_RISK".equals(c.direction()))
                .max(Comparator.comparingDouble(RiskPrediction.FeatureContribution::contribution))
                .map(c -> c.feature())
                .orElse("—");
    }

    private Map<String, Object> segment(String label, long value, String color) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("value", value);
        m.put("color", color);
        return m;
    }

    private Map<String, Object> activity(String label, int done, int total) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("done", done);
        m.put("total", total);
        m.put("pct", total == 0 ? 0 : Math.round(done * 100.0 / total));
        return m;
    }

    private Instant parseInstant(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Instant.parse(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private int age(String dob) {
        try {
            return LocalDate.now().getYear() - LocalDate.parse(dob).getYear();
        } catch (Exception e) {
            return 0;
        }
    }

    private double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }
}
