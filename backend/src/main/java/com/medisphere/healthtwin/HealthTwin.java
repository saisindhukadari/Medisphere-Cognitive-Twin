package com.medisphere.healthtwin;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "health_twins")
public class HealthTwin {
    @Id
    private String id;
    private String patientId;
    private double completenessScore;
    private String status;
    private Map<String, Object> bodyMetrics = new HashMap<>();
    private Map<String, String> riskMap = new HashMap<>();
    private Map<String, Object> vitalSummaries = new HashMap<>();
    private Map<String, Object> labSummaries = new HashMap<>();
    private List<String> conditions = new ArrayList<>();
    private List<String> medications = new ArrayList<>();
    private List<String> recentEvents = new ArrayList<>();
    private List<String> healthTrends = new ArrayList<>();
    private Instant lastSyncedAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public double getCompletenessScore() { return completenessScore; }
    public void setCompletenessScore(double completenessScore) { this.completenessScore = completenessScore; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Map<String, Object> getBodyMetrics() { return bodyMetrics; }
    public void setBodyMetrics(Map<String, Object> bodyMetrics) { this.bodyMetrics = bodyMetrics; }
    public Map<String, String> getRiskMap() { return riskMap; }
    public void setRiskMap(Map<String, String> riskMap) { this.riskMap = riskMap; }
    public Map<String, Object> getVitalSummaries() { return vitalSummaries; }
    public void setVitalSummaries(Map<String, Object> vitalSummaries) { this.vitalSummaries = vitalSummaries; }
    public Map<String, Object> getLabSummaries() { return labSummaries; }
    public void setLabSummaries(Map<String, Object> labSummaries) { this.labSummaries = labSummaries; }
    public List<String> getConditions() { return conditions; }
    public void setConditions(List<String> conditions) { this.conditions = conditions; }
    public List<String> getMedications() { return medications; }
    public void setMedications(List<String> medications) { this.medications = medications; }
    public List<String> getRecentEvents() { return recentEvents; }
    public void setRecentEvents(List<String> recentEvents) { this.recentEvents = recentEvents; }
    public List<String> getHealthTrends() { return healthTrends; }
    public void setHealthTrends(List<String> healthTrends) { this.healthTrends = healthTrends; }
    public Instant getLastSyncedAt() { return lastSyncedAt; }
    public void setLastSyncedAt(Instant lastSyncedAt) { this.lastSyncedAt = lastSyncedAt; }
}
