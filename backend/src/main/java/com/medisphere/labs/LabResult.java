package com.medisphere.labs;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "lab_results")
public class LabResult {
    @Id
    private String id;
    private String patientId;
    private String testName;
    private double value;
    private String unit;
    private String referenceRange;
    private String status;
    private Instant collectedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }
    public double getValue() { return value; }
    public void setValue(double value) { this.value = value; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getReferenceRange() { return referenceRange; }
    public void setReferenceRange(String referenceRange) { this.referenceRange = referenceRange; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCollectedAt() { return collectedAt; }
    public void setCollectedAt(Instant collectedAt) { this.collectedAt = collectedAt; }
}
