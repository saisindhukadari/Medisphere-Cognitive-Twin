package com.medisphere.consent;

import com.medisphere.audit.AuditService;
import com.medisphere.auth.CurrentUser;
import com.medisphere.common.GlobalExceptionHandler.NotFoundException;
import com.medisphere.patient.PatientRepository;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/consents")
public class ConsentController {
    private final ConsentRepository repository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;
    private final com.medisphere.auth.AccessControlService access;

    public ConsentController(ConsentRepository repository, PatientRepository patientRepository, AuditService auditService,
                             com.medisphere.auth.AccessControlService access) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.auditService = auditService;
        this.access = access;
    }

    @GetMapping
    public List<Consent> list(@RequestParam(required = false) String patientId) {
        String scoped = access.scopedPatientIdOrNull();
        if (scoped != null) return repository.findByPatientId(scoped);
        if (patientId != null) {
            access.checkPatientAccess(patientId);
            return repository.findByPatientId(patientId);
        }
        return repository.findAll();
    }

    public record ConsentRequest(String patientId, String category, String status) {}

    @PostMapping
    public Consent upsert(@RequestBody ConsentRequest r) {
        access.checkPatientAccess(r.patientId());
        final Consent c = repository.findAll().stream()
                .filter(x -> x.getPatientId().equals(r.patientId()) && x.getCategory().equals(r.category()))
                .findFirst().orElseGet(Consent::new);
        c.setPatientId(r.patientId());
        c.setCategory(r.category());
        c.setStatus(r.status());
        c.setGrantedBy(CurrentUser.email());
        c.setUpdatedAt(Instant.now());
        patientRepository.findById(r.patientId()).ifPresent(p -> {
            c.setPatientName(p.fullName());
            p.setConsentStatus(r.status());
            patientRepository.save(p);
        });
        Consent saved = repository.save(c);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "CONSENT_CHANGED", "Consent", saved.getId(), "SUCCESS", r.category() + " -> " + r.status());
        return saved;
    }

    @DeleteMapping("/{id}")
    public void withdraw(@PathVariable String id) {
        Consent c = repository.findById(id).orElseThrow(() -> new NotFoundException("Consent not found"));
        access.checkPatientAccess(c.getPatientId());
        c.setStatus("WITHDRAWN");
        c.setUpdatedAt(Instant.now());
        repository.save(c);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "CONSENT_WITHDRAWN", "Consent", id, "SUCCESS", c.getCategory());
    }
}
