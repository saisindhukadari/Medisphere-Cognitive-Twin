package com.medisphere.careplan;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "care_plans")
public class CarePlan {
    @Id
    private String id;
    private String patientId;
    private String patientName;
    private String goal;
    private String status; // AI_GENERATED, IN_REVIEW, APPROVED, ACTIVE, REJECTED, COMPLETED
    private String providerId;
    private String providerName;
    /** Care manager supporting the plan (optional — null when unassigned). */
    private String careManagerName;
    /** When the current doctor was assigned to this plan. */
    private Instant assignedAt;
    private double adherenceScore;
    private List<String> goals = new ArrayList<>();
    private List<String> interventions = new ArrayList<>();
    private List<String> medications = new ArrayList<>();
    private List<String> lifestyle = new ArrayList<>();
    private String monitoringSchedule;
    private String followUpSchedule;
    private String aiReasoning;
    private String guidelineReferences;
    private String modificationNotes;
    private String previousVersion;
    private List<ApprovalEvent> approvals = new ArrayList<>();
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    public record ApprovalEvent(String provider, String action, String notes, Instant timestamp) {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }
    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }
    public String getCareManagerName() { return careManagerName; }
    public void setCareManagerName(String careManagerName) { this.careManagerName = careManagerName; }
    public Instant getAssignedAt() { return assignedAt; }
    public void setAssignedAt(Instant assignedAt) { this.assignedAt = assignedAt; }
    public double getAdherenceScore() { return adherenceScore; }
    public void setAdherenceScore(double adherenceScore) { this.adherenceScore = adherenceScore; }
    public List<String> getGoals() { return goals; }
    public void setGoals(List<String> goals) { this.goals = goals; }
    public List<String> getInterventions() { return interventions; }
    public void setInterventions(List<String> interventions) { this.interventions = interventions; }
    public List<String> getMedications() { return medications; }
    public void setMedications(List<String> medications) { this.medications = medications; }
    public List<String> getLifestyle() { return lifestyle; }
    public void setLifestyle(List<String> lifestyle) { this.lifestyle = lifestyle; }
    public String getMonitoringSchedule() { return monitoringSchedule; }
    public void setMonitoringSchedule(String monitoringSchedule) { this.monitoringSchedule = monitoringSchedule; }
    public String getFollowUpSchedule() { return followUpSchedule; }
    public void setFollowUpSchedule(String followUpSchedule) { this.followUpSchedule = followUpSchedule; }
    public String getAiReasoning() { return aiReasoning; }
    public void setAiReasoning(String aiReasoning) { this.aiReasoning = aiReasoning; }
    public String getGuidelineReferences() { return guidelineReferences; }
    public void setGuidelineReferences(String guidelineReferences) { this.guidelineReferences = guidelineReferences; }
    public String getModificationNotes() { return modificationNotes; }
    public void setModificationNotes(String modificationNotes) { this.modificationNotes = modificationNotes; }
    public String getPreviousVersion() { return previousVersion; }
    public void setPreviousVersion(String previousVersion) { this.previousVersion = previousVersion; }
    public List<ApprovalEvent> getApprovals() { return approvals; }
    public void setApprovals(List<ApprovalEvent> approvals) { this.approvals = approvals; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
