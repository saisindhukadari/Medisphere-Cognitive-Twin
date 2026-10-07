package com.medisphere.labs;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/labs")
public class LabsController {
    private final LabResultRepository repository;
    private final com.medisphere.auth.AccessControlService access;

    public LabsController(LabResultRepository repository, com.medisphere.auth.AccessControlService access) {
        this.repository = repository;
        this.access = access;
    }

    @GetMapping("/{patientId}")
    public List<LabResult> byPatient(@PathVariable String patientId) {
        access.checkPatientAccess(patientId);
        return repository.findByPatientIdOrderByCollectedAtDesc(patientId);
    }

    @GetMapping("/patient/{patientId}")
    public List<LabResult> byPatientAlias(@PathVariable String patientId) {
        return byPatient(patientId);
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public LabResult create(@RequestBody LabResult result) { return repository.save(result); }
}
