package com.medisphere.vitals;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vitals")
public class VitalsController {
    private final VitalReadingRepository repository;
    private final VitalsService vitalsService;
    private final com.medisphere.auth.AccessControlService access;

    public VitalsController(VitalReadingRepository repository, VitalsService vitalsService,
                            com.medisphere.auth.AccessControlService access) {
        this.repository = repository;
        this.vitalsService = vitalsService;
        this.access = access;
    }

    @GetMapping("/{patientId}")
    public List<VitalReading> byPatient(@PathVariable String patientId) {
        access.checkPatientAccess(patientId);
        return repository.findByPatientIdOrderByTimestampDesc(patientId);
    }

    @GetMapping("/patient/{patientId}")
    public List<VitalReading> byPatientAlias(@PathVariable String patientId) {
        return byPatient(patientId);
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public VitalReading ingest(@RequestBody VitalReading reading) {
        return vitalsService.ingest(reading);
    }

    @GetMapping("/latest")
    public List<VitalReading> latest() {
        if (access.isPatientRole()) {
            String own = access.ownPatientId();
            return own == null ? List.of() : repository.findByPatientIdOrderByTimestampDesc(own);
        }
        return repository.findTop50ByOrderByTimestampDesc();
    }
}
