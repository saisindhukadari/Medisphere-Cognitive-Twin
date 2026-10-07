package com.medisphere.fhir;

import com.medisphere.audit.AuditService;
import com.medisphere.auth.CurrentUser;
import com.medisphere.common.GlobalExceptionHandler.BadRequestException;
import com.medisphere.common.GlobalExceptionHandler.NotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fhir")
public class FhirController {
    private final FhirResourceRepository repository;
    private final FhirValidationService validationService;
    private final AuditService auditService;
    private final com.medisphere.auth.AccessControlService access;

    public FhirController(FhirResourceRepository repository, FhirValidationService validationService, AuditService auditService,
                          com.medisphere.auth.AccessControlService access) {
        this.repository = repository;
        this.validationService = validationService;
        this.auditService = auditService;
        this.access = access;
    }

    @GetMapping("/resources")
    public List<FhirResourceEntity> list(@RequestParam(required = false) String patientId) {
        String scoped = access.scopedPatientIdOrNull();
        if (scoped != null) return repository.findByPatientId(scoped);
        return patientId == null ? repository.findAll() : repository.findByPatientId(patientId);
    }

    @GetMapping("/resources/{id}")
    public FhirResourceEntity get(@PathVariable String id) {
        FhirResourceEntity e = repository.findById(id).orElseThrow(() -> new NotFoundException("FHIR resource not found"));
        access.checkPatientAccess(e.getPatientId());
        return e;
    }

    @PostMapping("/import")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public FhirResourceEntity importResource(@RequestBody Map<String, Object> body) {
        return importInternal(body);
    }

    @PostMapping("/resources/import")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public FhirResourceEntity importResource2(@RequestBody Map<String, Object> body) {
        return importInternal(body);
    }

    private FhirResourceEntity importInternal(Map<String, Object> body) {
        Map<String, Object> resource = body.containsKey("resource") ? (Map<String, Object>) body.get("resource") : body;
        List<String> errors = validationService.validate(resource);
        FhirResourceEntity entity = new FhirResourceEntity();
        entity.setResource(resource);
        entity.setResourceType(String.valueOf(resource.getOrDefault("resourceType", "Unknown")));
        entity.setResourceId(String.valueOf(resource.getOrDefault("id", "")));
        Object subj = resource.get("subject");
        if (subj instanceof Map<?, ?> m && m.get("reference") != null) {
            entity.setPatientId(String.valueOf(m.get("reference")).replace("Patient/", ""));
        } else if ((body.get("patientId") != null)) {
            entity.setPatientId(String.valueOf(body.get("patientId")));
        }
        entity.setValidationStatus(errors.isEmpty() ? "VALID" : "INVALID");
        entity = repository.save(entity);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "FHIR_RESOURCE_IMPORTED", "FhirResource", entity.getId(), errors.isEmpty() ? "SUCCESS" : "INVALID", String.join("; ", errors));
        if (!errors.isEmpty()) {
            throw new BadRequestException("FHIR validation failed: " + String.join("; ", errors));
        }
        return entity;
    }

    @PostMapping("/validate")
    public Map<String, Object> validate(@RequestBody Map<String, Object> body) {
        Map<String, Object> resource = body.containsKey("resource") ? (Map<String, Object>) body.get("resource") : body;
        List<String> errors = validationService.validate(resource);
        return Map.of("valid", errors.isEmpty(), "errors", errors);
    }
}
