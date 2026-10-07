package com.medisphere.healthtwin;

import com.medisphere.common.GlobalExceptionHandler.NotFoundException;
import com.medisphere.patient.PatientRepository;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/health-twins")
public class HealthTwinController {
    private final HealthTwinRepository repository;
    private final PatientRepository patientRepository;
    private final com.medisphere.auth.AccessControlService access;

    public HealthTwinController(HealthTwinRepository repository, PatientRepository patientRepository,
                                com.medisphere.auth.AccessControlService access) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.access = access;
    }

    /** All twins (PATIENT role is scoped to its own twin only). */
    @GetMapping
    public List<Map<String, Object>> list() {
        String scoped = access.scopedPatientIdOrNull();
        List<Map<String, Object>> out = new ArrayList<>();
        for (HealthTwin t : repository.findAll()) {
            if (scoped != null && !scoped.equals(t.getPatientId())) continue;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", t.getId());
            row.put("patientId", t.getPatientId());
            var patient = patientRepository.findById(t.getPatientId()).orElse(null);
            row.put("patientName", patient == null ? "—" : patient.fullName());
            row.put("riskStatus", patient == null ? "LOW" : patient.getRiskStatus());
            row.put("doctor", patient == null ? null : patient.getProviderName());
            row.put("gender", patient == null ? null : patient.getGender());
            row.put("dateOfBirth", patient == null ? null : patient.getDateOfBirth());
            row.put("status", t.getStatus());
            row.put("completenessScore", t.getCompletenessScore());
            row.put("conditions", t.getConditions());
            row.put("riskMap", t.getRiskMap());
            row.put("cardiovascularRisk", t.getRiskMap().getOrDefault("cardiovascular", "LOW"));
            row.put("diabetesRisk", t.getRiskMap().getOrDefault("diabetes", "LOW"));
            row.put("lastSyncedAt", t.getLastSyncedAt() == null ? Instant.EPOCH : t.getLastSyncedAt());
            out.add(row);
        }
        out.sort((a, b) -> Double.compare((Double) b.get("completenessScore"), (Double) a.get("completenessScore")));
        return out;
    }

    @GetMapping("/{patientId}")
    public HealthTwin get(@PathVariable String patientId) {
        access.checkPatientAccess(patientId);
        return repository.findByPatientId(patientId)
                .orElseThrow(() -> new NotFoundException("Health twin not found for patient " + patientId));
    }
}
