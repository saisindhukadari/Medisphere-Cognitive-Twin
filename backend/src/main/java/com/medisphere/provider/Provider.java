package com.medisphere.provider;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "providers")
public class Provider {
    @Id
    private String id;
    private String name;
    private String specialty;
    private String email;
    private int assignedPatients;
    private int activeAlerts;
    private int carePlans;
    private double performanceScore;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public int getAssignedPatients() { return assignedPatients; }
    public void setAssignedPatients(int assignedPatients) { this.assignedPatients = assignedPatients; }
    public int getActiveAlerts() { return activeAlerts; }
    public void setActiveAlerts(int activeAlerts) { this.activeAlerts = activeAlerts; }
    public int getCarePlans() { return carePlans; }
    public void setCarePlans(int carePlans) { this.carePlans = carePlans; }
    public double getPerformanceScore() { return performanceScore; }
    public void setPerformanceScore(double performanceScore) { this.performanceScore = performanceScore; }
}
