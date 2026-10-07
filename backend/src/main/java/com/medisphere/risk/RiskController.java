package com.medisphere.risk;

import com.medisphere.audit.AuditService;
import com.medisphere.auth.CurrentUser;
import com.medisphere.common.GlobalExceptionHandler.NotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/risk-predictions")
public class RiskController {
    private final RiskPredictionService service;
    private final AuditService auditService;
    private final com.medisphere.auth.AccessControlService access;

    public RiskController(RiskPredictionService service, AuditService auditService,
                          com.medisphere.auth.AccessControlService access) {
        this.service = service;
        this.auditService = auditService;
        this.access = access;
    }

    @GetMapping
    public List<RiskPrediction> latest() { return service.latest(); }

    @GetMapping("/{id}")
    public RiskPrediction byId(@PathVariable String id) {
        RiskPrediction p = service.findById(id);
        access.checkPatientAccess(p.getPatientId());
        return p;
    }

    @GetMapping("/patient/{patientId}")
    public List<RiskPrediction> byPatient(@PathVariable String patientId) {
        access.checkPatientAccess(patientId);
        return service.byPatient(patientId);
    }

    @PostMapping("/{patientId}/generate")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public RiskPrediction generate(@PathVariable String patientId) {
        return generateInternal(patientId);
    }

    @PostMapping("/predict/{patientId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public RiskPrediction predict(@PathVariable String patientId) {
        return generateInternal(patientId);
    }

    private RiskPrediction generateInternal(String patientId) {
        RiskPrediction rp = service.generate(patientId);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "RISK_PREDICTION_GENERATED", "RiskPrediction", rp.getId(), "SUCCESS", "Model " + rp.getModelVersion() + " score " + rp.getOverallScore() + " (" + rp.getRiskCategory() + ")");
        return rp;
    }
}
