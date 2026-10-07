package com.medisphere.risk;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "risk_predictions")
public class RiskPrediction {
    @Id
    private String id;
    private String patientId;
    private String patientName;
    private double cardiovascularRisk10y;
    private double diabetesComplicationRisk;
    private double overallScore;
    private String riskCategory; // LOW, MODERATE, HIGH, VERY_HIGH
    private String trend; // RISING, STABLE, IMPROVING
    private double confidence;
    private String modelVersion;
    private String evidenceSummary;
    private String methodology;
    private boolean synthetic = true;
    private List<FeatureContribution> contributions = new ArrayList<>();
    private Instant predictedAt = Instant.now();

    public record FeatureContribution(String feature, double contribution, String direction) {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public double getCardiovascularRisk10y() { return cardiovascularRisk10y; }
    public void setCardiovascularRisk10y(double cardiovascularRisk10y) { this.cardiovascularRisk10y = cardiovascularRisk10y; }
    public double getDiabetesComplicationRisk() { return diabetesComplicationRisk; }
    public void setDiabetesComplicationRisk(double diabetesComplicationRisk) { this.diabetesComplicationRisk = diabetesComplicationRisk; }
    public double getOverallScore() { return overallScore; }
    public void setOverallScore(double overallScore) { this.overallScore = overallScore; }
    public String getRiskCategory() { return riskCategory; }
    public void setRiskCategory(String riskCategory) { this.riskCategory = riskCategory; }
    public String getTrend() { return trend; }
    public void setTrend(String trend) { this.trend = trend; }
    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
    public String getEvidenceSummary() { return evidenceSummary; }
    public void setEvidenceSummary(String evidenceSummary) { this.evidenceSummary = evidenceSummary; }
    public String getMethodology() { return methodology; }
    public void setMethodology(String methodology) { this.methodology = methodology; }
    public boolean isSynthetic() { return synthetic; }
    public void setSynthetic(boolean synthetic) { this.synthetic = synthetic; }
    public List<FeatureContribution> getContributions() { return contributions; }
    public void setContributions(List<FeatureContribution> contributions) { this.contributions = contributions; }
    public Instant getPredictedAt() { return predictedAt; }
    public void setPredictedAt(Instant predictedAt) { this.predictedAt = predictedAt; }
}
