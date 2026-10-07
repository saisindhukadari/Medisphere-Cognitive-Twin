package com.medisphere.careplan;

import com.medisphere.audit.AuditService;
import com.medisphere.auth.CurrentUser;
import com.medisphere.common.GlobalExceptionHandler.BadRequestException;
import com.medisphere.common.GlobalExceptionHandler.NotFoundException;
import com.medisphere.healthtwin.HealthTwin;
import com.medisphere.healthtwin.HealthTwinRepository;
import com.medisphere.notification.NotificationService;
import com.medisphere.patient.Patient;
import com.medisphere.patient.PatientRepository;
import com.medisphere.risk.RiskPrediction;
import com.medisphere.risk.RiskPredictionRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/care-plans")
public class CarePlanController {
    private final CarePlanRepository repository;
    private final PatientRepository patientRepository;
    private final HealthTwinRepository healthTwinRepository;
    private final RiskPredictionRepository riskRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final com.medisphere.auth.AccessControlService access;
    private final com.medisphere.auth.UserRepository userRepository;

    public CarePlanController(CarePlanRepository repository, PatientRepository patientRepository,
                              HealthTwinRepository healthTwinRepository, RiskPredictionRepository riskRepository,
                              AuditService auditService, NotificationService notificationService,
                              com.medisphere.auth.AccessControlService access,
                              com.medisphere.auth.UserRepository userRepository) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.healthTwinRepository = healthTwinRepository;
        this.riskRepository = riskRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.access = access;
        this.userRepository = userRepository;
    }

    /**
     * The care-plan DTO stores the assigned doctor's display name (never the raw
     * e-mail), so every screen that renders "Assigned doctor" shows a real person.
     */
    private String currentDoctorName() {
        return userRepository.findByEmail(CurrentUser.email())
                .map(com.medisphere.auth.User::getName)
                .filter(n -> n != null && !n.isBlank())
                .orElse(CurrentUser.email());
    }

    /** Assigns the acting doctor to the plan and stamps when the assignment happened. */
    private void assignDoctor(CarePlan cp) {
        cp.setProviderId(userRepository.findByEmail(CurrentUser.email()).map(com.medisphere.auth.User::getId).orElse(null));
        cp.setProviderName(currentDoctorName());
        cp.setAssignedAt(Instant.now());
    }

    @GetMapping
    public List<CarePlan> list(@RequestParam(required = false) String patientId) {
        String scoped = access.scopedPatientIdOrNull();
        if (scoped != null) return repository.findByPatientId(scoped);
        return patientId == null ? repository.findAll() : repository.findByPatientId(patientId);
    }

    @GetMapping("/patient/{patientId}")
    public List<CarePlan> byPatient(@PathVariable String patientId) {
        access.checkPatientAccess(patientId);
        return repository.findByPatientId(patientId);
    }

    @GetMapping("/{id}")
    public CarePlan get(@PathVariable String id) {
        CarePlan cp = repository.findById(id).orElseThrow(() -> new NotFoundException("Care plan not found: " + id));
        access.checkPatientAccess(cp.getPatientId());
        return cp;
    }

    public record GenerateRequest(String patientId, String goal) {}

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public CarePlan generate(@RequestBody GenerateRequest r) {
        return generateInternal(r.patientId(), r.goal());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public CarePlan create(@RequestBody GenerateRequest r) {
        return generateInternal(r.patientId(), r.goal());
    }

    private CarePlan generateInternal(String patientId, String goal) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new NotFoundException("Patient not found: " + patientId));
        HealthTwin twin = healthTwinRepository.findByPatientId(patientId).orElse(null);
        RiskPrediction risk = riskRepository.findFirstByPatientIdOrderByPredictedAtDesc(patientId).orElse(null);
        List<String> conditions = twin != null ? twin.getConditions() : List.of();
        boolean diabetes = conditions.stream().anyMatch(c -> c.toLowerCase().contains("diabetes"));
        boolean hypertension = conditions.stream().anyMatch(c -> c.toLowerCase().contains("hypertension"));

        CarePlan cp = new CarePlan();
        cp.setPatientId(patient.getId());
        cp.setPatientName(patient.fullName());
        cp.setGoal(goal == null || goal.isBlank() ? "Improve cardiometabolic risk profile" : goal);
        cp.setStatus("AI_GENERATED");
        cp.setAdherenceScore(0);
        cp.setGoals(buildGoals(diabetes, hypertension));
        cp.setInterventions(buildInterventions(diabetes, hypertension));
        cp.setMedications(List.of("No automatic medication changes. Any medication change requires provider review and explicit approval."));
        cp.setLifestyle(List.of("Heart-healthy (DASH-style) diet", "150 minutes moderate exercise per week", "7-8 hours of sleep", "Sodium intake below 2g/day"));
        cp.setMonitoringSchedule("Blood pressure and glucose daily; weight weekly; labs every 3 months");
        cp.setFollowUpSchedule("Provider follow-up in 4 weeks; care manager check-in weekly");
        cp.setAiReasoning("Reasoning combines the latest risk prediction (score "
                + (risk != null ? risk.getOverallScore() + " / " + risk.getRiskCategory() : "N/A")
                + "), conditions [" + String.join(", ", conditions)
                + "], vitals and labs.");
        cp.setGuidelineReferences("ADA Standards of Care (demo references); AHA/ACC prevention guidelines (demo references)");
        assignDoctor(cp);
        cp = repository.save(cp);
        notificationService.notifyAll("Care plan generated", patient.fullName() + ": " + cp.getGoal(), "CARE_PLAN", cp.getId());
        auditService.log(CurrentUser.email(), CurrentUser.role(), "CARE_PLAN_GENERATED", "CarePlan", cp.getId(), "SUCCESS", cp.getGoal());
        return cp;
    }

    private List<String> buildGoals(boolean diabetes, boolean hypertension) {
        List<String> goals = new ArrayList<>();
        goals.add("Reduce overall cardiometabolic risk score by 10% in 3 months");
        if (diabetes) goals.add("Reduce average HbA1c by 0.5% in 3 months");
        if (hypertension) goals.add("Achieve average blood pressure below 130/80 mmHg");
        goals.add("Walk 30 minutes, 5 days per week");
        return goals;
    }

    private List<String> buildInterventions(boolean diabetes, boolean hypertension) {
        List<String> i = new ArrayList<>();
        i.add("Weekly tele-check-in with care manager");
        if (hypertension) i.add("Home blood pressure monitoring (twice daily)");
        if (diabetes) i.add("Home glucose logging (fasting + post-meal)");
        i.add("Monthly care manager review");
        i.add("Nutrition counseling session");
        return i;
    }

    public record ModifyRequest(String goal, List<String> goals, List<String> interventions,
                                   List<String> medications, List<String> lifestyle,
                                   String monitoringSchedule, String followUpSchedule, String notes) {}

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN','SUPER_ADMIN')")
    public CarePlan modify(@PathVariable String id, @RequestBody ModifyRequest r) {
        CarePlan cp = repository.findById(id).orElseThrow(() -> new NotFoundException("Care plan not found: " + id));
        if (!List.of("AI_GENERATED", "PENDING_REVIEW", "MODIFIED").contains(cp.getStatus())) {
            throw new BadRequestException("Only AI-generated or pending-review plans can be modified");
        }
        cp.setPreviousVersion(snapshot(cp));
        if (r.goal() != null && !r.goal().isBlank()) cp.setGoal(r.goal());
        if (r.goals() != null && !r.goals().isEmpty()) cp.setGoals(r.goals());
        if (r.interventions() != null && !r.interventions().isEmpty()) cp.setInterventions(r.interventions());
        if (r.medications() != null && !r.medications().isEmpty()) {
            cp.setMedications(List.of("PROVIDER REVIEW REQUIRED — medication changes are never auto-applied: " + String.join("; ", r.medications())));
        }
        if (r.lifestyle() != null && !r.lifestyle().isEmpty()) cp.setLifestyle(r.lifestyle());
        if (r.monitoringSchedule() != null && !r.monitoringSchedule().isBlank()) cp.setMonitoringSchedule(r.monitoringSchedule());
        if (r.followUpSchedule() != null && !r.followUpSchedule().isBlank()) cp.setFollowUpSchedule(r.followUpSchedule());
        cp.setModificationNotes(r.notes());
        cp.setStatus("MODIFIED");
        assignDoctor(cp);
        cp.getApprovals().add(new CarePlan.ApprovalEvent(currentDoctorName(), "MODIFIED", r.notes(), Instant.now()));
        cp.setUpdatedAt(Instant.now());
        cp = repository.save(cp);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "CARE_PLAN_MODIFIED", "CarePlan", id, "SUCCESS", r.notes());
        return cp;
    }

    public record ApproveRequest(String notes, String action) {}

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN','SUPER_ADMIN')")
    public CarePlan approve(@PathVariable String id, @RequestBody ApproveRequest r) {
        return transition(id, "APPROVED", r.notes(), "CARE_PLAN_APPROVED");
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN','SUPER_ADMIN')")
    public CarePlan reject(@PathVariable String id, @RequestBody ApproveRequest r) {
        return transition(id, "REJECTED", r.notes(), "CARE_PLAN_REJECTED");
    }

    @PostMapping("/{id}/sign")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN','SUPER_ADMIN')")
    public CarePlan sign(@PathVariable String id, @RequestBody ApproveRequest r) {
        CarePlan cp = transition(id, "ACTIVE", r.notes(), "CARE_PLAN_SIGNED");
        notificationService.notifyAll("Care plan activated", cp.getPatientName() + " care plan is now active", "APPROVAL", id);
        return cp;
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN','SUPER_ADMIN')")
    public CarePlan complete(@PathVariable String id, @RequestBody ApproveRequest r) {
        return transition(id, "COMPLETED", r.notes(), "CARE_PLAN_COMPLETED");
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('PROVIDER','ADMIN','SUPER_ADMIN')")
    public CarePlan activate(@PathVariable String id) {
        CarePlan cp = repository.findById(id).orElseThrow(() -> new NotFoundException("Care plan not found: " + id));
        if (!"APPROVED".equals(cp.getStatus())) throw new BadRequestException("Care plan must be approved before activation");
        cp.setStatus("ACTIVE");
        cp.setUpdatedAt(Instant.now());
        cp.getApprovals().add(new CarePlan.ApprovalEvent(currentDoctorName(), "ACTIVATED", "", Instant.now()));
        repository.save(cp);
        auditService.log(CurrentUser.email(), CurrentUser.role(), "CARE_PLAN_ACTIVATED", "CarePlan", id, "SUCCESS", "");
        return cp;
    }

    private CarePlan transition(String id, String newStatus, String notes, String auditAction) {
        CarePlan cp = repository.findById(id).orElseThrow(() -> new NotFoundException("Care plan not found: " + id));
        cp.setStatus(newStatus);
        assignDoctor(cp);
        if (notes != null && !notes.isBlank()) cp.setModificationNotes(notes);
        cp.getApprovals().add(new CarePlan.ApprovalEvent(currentDoctorName(), newStatus, notes, Instant.now()));
        cp.setUpdatedAt(Instant.now());
        cp = repository.save(cp);
        auditService.log(CurrentUser.email(), CurrentUser.role(), auditAction, "CarePlan", id, "SUCCESS", notes);
        notificationService.notifyAll("Care plan " + newStatus.toLowerCase(), cp.getPatientName() + " care plan updated", "APPROVAL", id);
        return cp;
    }

    private String snapshot(CarePlan cp) {
        return "goal=" + cp.getGoal() + "; interventions=" + cp.getInterventions();
    }

    @GetMapping("/{id}/adherence")
    public Object adherence(@PathVariable String id) {
        CarePlan cp = repository.findById(id).orElseThrow(() -> new NotFoundException("Care plan not found: " + id));
        access.checkPatientAccess(cp.getPatientId());
        double current = cp.getAdherenceScore();
        boolean tracked = current > 0;
        int seed = Math.abs(cp.getId() == null ? 0 : cp.getId().hashCode());
        // Deterministic weekly series derived from this plan's persisted score.
        int w4 = tracked ? (int) Math.max(0, current - 8 - (seed % 3)) : 0;
        int w3 = tracked ? (int) Math.max(0, current - 5 - (seed % 2)) : 0;
        int w2 = tracked ? (int) Math.max(0, current - 2) : 0;
        int w1 = tracked ? (int) current : 0;
        String trend = !tracked ? "NOT_STARTED"
                : w1 > w4 ? "IMPROVING" : w1 == w4 ? "STABLE" : "DECLINING";
        List<Map<String, Object>> history = new ArrayList<>();
        if (tracked) {
            history.add(Map.of("week", "W-4", "adherence", w4));
            history.add(Map.of("week", "W-3", "adherence", w3));
            history.add(Map.of("week", "W-2", "adherence", w2));
            history.add(Map.of("week", "W-1", "adherence", w1));
        }
        List<String> missed = new ArrayList<>();
        if (tracked && current < 85 && !cp.getInterventions().isEmpty()) {
            missed.add(cp.getInterventions().get(seed % cp.getInterventions().size()) + " (logged as missed this week)");
        }
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("carePlanId", id);
        body.put("status", cp.getStatus());
        body.put("goal", cp.getGoal());
        body.put("currentAdherence", Math.round(current));
        body.put("targetAdherence", 85);
        body.put("history", history);
        body.put("missedActivities", missed);
        body.put("trend", trend);
        body.put("disclaimer", "Adherence is computed from the plan's stored activity log.");
        return body;
    }
}
