package com.medisphere.patient;

import com.medisphere.audit.AuditService;
import com.medisphere.auth.AccessControlService;
import com.medisphere.auth.CurrentUser;
import com.medisphere.common.GlobalExceptionHandler.NotFoundException;
import com.medisphere.common.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/patients")
public class PatientController {
    private final PatientRepository repository;
    private final AuditService auditService;
    private final MongoTemplate mongoTemplate;
    private final AccessControlService access;

    public PatientController(PatientRepository repository, AuditService auditService,
                             MongoTemplate mongoTemplate, AccessControlService access) {
        this.repository = repository;
        this.auditService = auditService;
        this.mongoTemplate = mongoTemplate;
        this.access = access;
    }

    public record PatientRequest(
            @NotBlank String firstName, @NotBlank String lastName, @NotBlank String dateOfBirth,
            String gender, String email, String phone, String address, String providerId,
            String riskStatus, String consentStatus, String medicalIdentifier) {}

    @GetMapping
    public PageResponse<Patient> list(@RequestParam(defaultValue = "") String search,
                                      @RequestParam(required = false) String risk,
                                      @RequestParam(required = false) String consent,
                                      @RequestParam(required = false) String providerId,
                                      @RequestParam(defaultValue = "updatedAt") String sort,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size) {
        String own = access.scopedPatientIdOrNull();
        if (own != null) {
            return new PageResponse<>(repository.findById(own).map(List::of).orElse(List.of()), 0, 1, 1, 1);
        }
        Query q = new Query();
        List<Criteria> criteria = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            Pattern p = Pattern.compile(Pattern.quote(search), Pattern.CASE_INSENSITIVE);
            criteria.add(new Criteria().orOperator(
                    Criteria.where("firstName").regex(p),
                    Criteria.where("lastName").regex(p),
                    Criteria.where("medicalIdentifier").regex(p)));
        }
        if (risk != null && !risk.isBlank()) criteria.add(Criteria.where("riskStatus").is(risk));
        if (consent != null && !consent.isBlank()) criteria.add(Criteria.where("consentStatus").is(consent));
        if (providerId != null && !providerId.isBlank()) criteria.add(Criteria.where("providerId").is(providerId));
        if (!criteria.isEmpty()) q.addCriteria(new Criteria().andOperator(criteria.toArray(new Criteria[0])));

        String sortField = switch (sort == null ? "updatedAt" : sort) {
            case "name" -> "lastName";
            case "risk" -> "riskStatus";
            default -> "updatedAt";
        };
        q.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, sortField));
        long total = mongoTemplate.count(q, Patient.class);
        q.with(PageRequest.of(page, size));
        List<Patient> content = mongoTemplate.find(q, Patient.class);
        int totalPages = (int) Math.max(1, (total + size - 1) / size);
        return new PageResponse<>(content, page, size, total, totalPages);
    }

    @GetMapping("/{id}")
    public Patient get(@PathVariable String id) {
        access.checkPatientAccess(id);
        Patient p = repository.findById(id).orElseThrow(() -> new NotFoundException("Patient not found: " + id));
        auditService.log(CurrentUser.email(), CurrentUser.role(), "PATIENT_VIEWED", "Patient", id, "SUCCESS", "Patient 360 opened");
        return p;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public Patient create(@Valid @RequestBody PatientRequest r) {
        Patient p = new Patient();
        apply(p, r);
        p = repository.save(p);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "PATIENT_CREATED", "Patient", p.getId(), "SUCCESS", p.fullName());
        return p;
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public Patient update(@PathVariable String id, @Valid @RequestBody PatientRequest r) {
        Patient p = repository.findById(id).orElseThrow(() -> new NotFoundException("Patient not found: " + id));
        apply(p, r);
        p = repository.save(p);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "PATIENT_UPDATED", "Patient", id, "SUCCESS", p.fullName());
        return p;
    }

    private void apply(Patient p, PatientRequest r) {
        p.setFirstName(r.firstName());
        p.setLastName(r.lastName());
        p.setDateOfBirth(r.dateOfBirth());
        p.setGender(r.gender());
        p.setEmail(r.email());
        p.setPhone(r.phone());
        p.setAddress(r.address());
        p.setProviderId(r.providerId());
        p.setRiskStatus(r.riskStatus() == null ? "LOW" : r.riskStatus());
        p.setConsentStatus(r.consentStatus() == null ? "PENDING" : r.consentStatus());
        p.setMedicalIdentifier(r.medicalIdentifier());
        p.setUpdatedAt(Instant.now());
    }
}
