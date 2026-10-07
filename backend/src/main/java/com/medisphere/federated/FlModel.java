package com.medisphere.federated;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "fl_models")
public class FlModel {
    @Id
    private String id;
    private String name;
    private String version;
    private String type;
    private String status; // ACTIVE, INACTIVE, TRAINING
    private double accuracy;
    private String trainingDate;
    private String datasetInfo;
    private String validationResults;
    private int federatedRound;
    private double loss;
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public double getAccuracy() { return accuracy; }
    public void setAccuracy(double accuracy) { this.accuracy = accuracy; }
    public String getTrainingDate() { return trainingDate; }
    public void setTrainingDate(String trainingDate) { this.trainingDate = trainingDate; }
    public String getDatasetInfo() { return datasetInfo; }
    public void setDatasetInfo(String datasetInfo) { this.datasetInfo = datasetInfo; }
    public String getValidationResults() { return validationResults; }
    public void setValidationResults(String validationResults) { this.validationResults = validationResults; }
    public int getFederatedRound() { return federatedRound; }
    public void setFederatedRound(int federatedRound) { this.federatedRound = federatedRound; }
    public double getLoss() { return loss; }
    public void setLoss(double loss) { this.loss = loss; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
