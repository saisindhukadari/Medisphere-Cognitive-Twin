package com.medisphere.alerts;

import com.medisphere.common.PageResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {
    private final AlertService alertService;
    private final AlertRepository repository;
    private final com.medisphere.auth.AccessControlService access;

    public AlertController(AlertService alertService, AlertRepository repository,
                           com.medisphere.auth.AccessControlService access) {
        this.alertService = alertService;
        this.repository = repository;
        this.access = access;
    }

    @GetMapping
    public PageResponse<Alert> list(@RequestParam(defaultValue = "") String status,
                                    @RequestParam(defaultValue = "") String severity,
                                    @RequestParam(defaultValue = "") String patientId,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        return alertService.list(status, page, size, access.scopedPatientIdOrNull(), patientId, severity);
    }

    @GetMapping("/{id}")
    public Alert get(@PathVariable String id) {
        Alert a = repository.findById(id).orElseThrow(() -> new com.medisphere.common.GlobalExceptionHandler.NotFoundException("Alert not found"));
        access.checkPatientAccess(a.getPatientId());
        return a;
    }

    public record StatusBody(String status, String note) {}
    public record AssignBody(String provider) {}
    public record NoteBody(String note) {}

    @PostMapping("/{id}/status")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public Alert setStatus(@PathVariable String id, @RequestBody StatusBody body) {
        return alertService.transition(id, body.status(), body.note());
    }

    @PostMapping("/{id}/assign")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public Alert assign(@PathVariable String id, @RequestBody AssignBody body) {
        return alertService.assign(id, body.provider());
    }

    @PostMapping("/{id}/note")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public Alert note(@PathVariable String id, @RequestBody NoteBody body) {
        return alertService.addNote(id, body.note());
    }
}
