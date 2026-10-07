package com.medisphere.alerts;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "alerts")
public class Alert {
    @Id
    private String id;
    private String patientId;
    private String patientName;
    private String type;
    private String category; // CRITICAL, HIGH, MEDIUM, LOW
    private String vitalType;
    private double value;
    private double threshold;
    private String aiAnalysis;
    private double confidence;
    private String assignedProvider;
    private String status; // NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED, FALSE_POSITIVE
    private String clinicalNote;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getVitalType() { return vitalType; }
    public void setVitalType(String vitalType) { this.vitalType = vitalType; }
    public double getValue() { return value; }
    public void setValue(double value) { this.value = value; }
    public double getThreshold() { return threshold; }
    public void setThreshold(double threshold) { this.threshold = threshold; }
    public String getAiAnalysis() { return aiAnalysis; }
    public void setAiAnalysis(String aiAnalysis) { this.aiAnalysis = aiAnalysis; }
    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }
    public String getAssignedProvider() { return assignedProvider; }
    public void setAssignedProvider(String assignedProvider) { this.assignedProvider = assignedProvider; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getClinicalNote() { return clinicalNote; }
    public void setClinicalNote(String clinicalNote) { this.clinicalNote = clinicalNote; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
