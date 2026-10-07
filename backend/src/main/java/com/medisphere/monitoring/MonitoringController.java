package com.medisphere.monitoring;

import com.medisphere.alerts.AlertRepository;
import com.medisphere.patient.PatientRepository;
import com.medisphere.vitals.SettingsController;
import com.medisphere.vitals.VitalReading;
import com.medisphere.vitals.VitalReadingRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/monitoring")
@org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
public class MonitoringController {
    private final DeviceRepository deviceRepository;
    private final VitalReadingRepository vitalReadingRepository;
    private final AlertRepository alertRepository;
    private final PatientRepository patientRepository;

    public MonitoringController(DeviceRepository deviceRepository, VitalReadingRepository vitalReadingRepository,
                                AlertRepository alertRepository, PatientRepository patientRepository) {
        this.deviceRepository = deviceRepository;
        this.vitalReadingRepository = vitalReadingRepository;
        this.alertRepository = alertRepository;
        this.patientRepository = patientRepository;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        Instant dayAgo = Instant.now().minusSeconds(24L * 3600);
        List<VitalReading> recent = vitalReadingRepository.findAll().stream()
                .filter(v -> v.getTimestamp() != null && v.getTimestamp().isAfter(dayAgo)).toList();
        Set<String> online = recent.stream().map(VitalReading::getPatientId).collect(Collectors.toSet());
        long abnormal = recent.stream().filter(this::isAbnormal).count();
        long activeAlerts = alertRepository.countByStatus("NEW") + alertRepository.countByStatus("ACKNOWLEDGED")
                + alertRepository.countByStatus("INVESTIGATING");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("connectedDevices", deviceRepository.count());
        body.put("onlinePatients", online.size());
        body.put("totalPatients", patientRepository.count());
        body.put("recentVitals", recent.size());
        body.put("abnormalReadings", abnormal);
        body.put("activeAlerts", activeAlerts);
        body.put("simulationMode", true);
        body.put("kafkaEnabled", false);
        body.put("mode", "Platform vitals service active — device readings are received continuously.");
        body.put("updatedAt", Instant.now().toString());
        return body;
    }

    @GetMapping("/devices")
    public Object devices(@RequestParam(required = false) String patientId) {
        var all = deviceRepository.findAll();
        if (patientId == null || patientId.isBlank()) return all;
        return all.stream().filter(d -> patientId.equals(d.getPatientId())).toList();
    }

    private boolean isAbnormal(VitalReading v) {
        return switch (v.getType()) {
            case "HEART_RATE" -> v.getValue() > SettingsController.heartRateUpper || v.getValue() < 45;
            case "SPO2" -> v.getValue() < SettingsController.spo2Lower;
            case "GLUCOSE" -> v.getValue() > SettingsController.glucoseUpper || v.getValue() < 70;
            case "BLOOD_PRESSURE" -> v.getValue() > SettingsController.systolicUpper;
            case "TEMPERATURE" -> v.getValue() > SettingsController.temperatureFever;
            default -> false;
        };
    }
}
