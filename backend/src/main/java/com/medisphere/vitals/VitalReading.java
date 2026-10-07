package com.medisphere.vitals;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "vitals")
public class VitalReading {
    @Id
    private String id;
    private String patientId;
    private String type; // HEART_RATE, BLOOD_PRESSURE, SPO2, TEMPERATURE, RESP_RATE, GLUCOSE, STEPS, ACTIVITY
    private double value;
    private String unit;
    private String deviceId;
    private Instant timestamp = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public double getValue() { return value; }
    public void setValue(double value) { this.value = value; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
