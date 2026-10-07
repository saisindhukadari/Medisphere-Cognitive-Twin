package com.medisphere.alerts;

import com.medisphere.audit.AuditService;
import com.medisphere.auth.CurrentUser;
import com.medisphere.common.GlobalExceptionHandler.NotFoundException;
import com.medisphere.common.PageResponse;
import com.medisphere.notification.NotificationService;
import com.medisphere.patient.PatientRepository;
import com.medisphere.vitals.RuleEngineService.AlertCandidate;
import com.medisphere.vitals.VitalReading;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
public class AlertService {
    private final AlertRepository repository;
    private final PatientRepository patientRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public AlertService(AlertRepository repository, PatientRepository patientRepository, AuditService auditService, NotificationService notificationService) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    public Alert createFromVital(VitalReading v, AlertCandidate c) {
        // Alert fatigue prevention: deduplicate identical alerts within a 1-hour cooldown
        Instant cooldown = Instant.now().minusSeconds(3600);
        boolean duplicate = repository.findByPatientIdAndTypeAndStatusAndCreatedAtAfter(
                v.getPatientId(), c.type(), "NEW", cooldown).isPresent();
        if (duplicate) return null;
        final Alert alert = new Alert();
        alert.setPatientId(v.getPatientId());
        patientRepository.findById(v.getPatientId()).ifPresent(p -> alert.setPatientName(p.fullName()));
        alert.setType(c.type());
        alert.setCategory(c.severity());
        alert.setVitalType(v.getType());
        alert.setValue(v.getValue());
        alert.setThreshold(c.threshold());
        alert.setAiAnalysis(c.message() + " (rule-engine analysis)");
        alert.setConfidence(c.confidence());
        alert.setStatus("NEW");
        Alert a = repository.save(alert);
        notificationService.notifyAll("Alert: " + c.type(), a.getPatientName() + " - value " + v.getValue(), "ALERT", a.getId());
        return a;
    }

    public Alert transition(String id, String newStatus, String note) {
        Alert a = repository.findById(id).orElseThrow(() -> new NotFoundException("Alert not found"));
        a.setStatus(newStatus);
        if (note != null && !note.isBlank()) a.setClinicalNote(note);
        a.setUpdatedAt(Instant.now());
        a = repository.save(a);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "ALERT_" + newStatus, "Alert", id, "SUCCESS", note);
        return a;
    }

    public Alert assign(String id, String provider) {
        Alert a = repository.findById(id).orElseThrow(() -> new NotFoundException("Alert not found"));
        a.setAssignedProvider(provider);
        a.setUpdatedAt(Instant.now());
        a = repository.save(a);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "ALERT_ASSIGNED", "Alert", id, "SUCCESS", provider);
        return a;
    }

    /** Appends a clinical note to an alert without changing its workflow status. */
    public Alert addNote(String id, String note) {
        Alert a = repository.findById(id).orElseThrow(() -> new NotFoundException("Alert not found"));
        a.setClinicalNote(note);
        a.setUpdatedAt(Instant.now());
        a = repository.save(a);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "ALERT_NOTE_ADDED", "Alert", id, "SUCCESS", note);
        return a;
    }

    public PageResponse<Alert> list(String status, int page, int size) {
        return list(status, page, size, null, null, null);
    }

    /**
     * Filterable, paginated alert listing.
     *
     * @param patientIdScope  limits results to a single patient (PATIENT role scoping); null = unrestricted.
     * @param patientIdFilter optional staff-side filter for one patient.
     * @param severity        optional CRITICAL/HIGH/MEDIUM/LOW filter.
     */
    public PageResponse<Alert> list(String status, int page, int size, String patientIdScope,
                                    String patientIdFilter, String severity) {
        List<Alert> base;
        if (patientIdScope != null) {
            base = repository.findByPatientIdOrderByCreatedAtDesc(patientIdScope, PageRequest.of(0, 10_000)).getContent();
        } else if (patientIdFilter != null && !patientIdFilter.isBlank()) {
            base = repository.findByPatientIdOrderByCreatedAtDesc(patientIdFilter, PageRequest.of(0, 10_000)).getContent();
        } else {
            base = repository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 10_000)).getContent();
        }
        final List<Alert> filtered = base.stream()
                .filter(a -> status == null || status.isBlank() || status.equals(a.getStatus()))
                .filter(a -> severity == null || severity.isBlank() || severity.equalsIgnoreCase(a.getCategory()))
                .sorted(Comparator.comparing(Alert::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        int from = Math.min(page * size, filtered.size());
        int to = Math.min(from + size, filtered.size());
        long total = filtered.size();
        int totalPages = size <= 0 ? 1 : (int) Math.ceil((double) total / size);
        return new PageResponse<>(filtered.subList(from, to), page, size, total, Math.max(totalPages, 1));
    }
}
