package com.medisphere.monitoring;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Wearable / connected device attached to a patient.
 *
 * <p>All devices in this prototype are <strong>simulated</strong>: no real
 * hardware is paired with the system. Device metadata (model, battery, signal)
 * is deterministic demo data seeded alongside the clinical dataset, while the
 * connection status shown on the dashboard is derived from the timestamps of
 * the device's own vital readings.</p>
 */
@Document(collection = "devices")
public class Device {
    @Id
    private String id;
    private String patientId;
    private String patientName;
    /** WEARABLE_WATCH, FITNESS_TRACKER, BP_CUFF, PULSE_OXIMETER, GLUCOSE_MONITOR */
    private String type;
    private String name;
    private String modelName;
    private String firmware;
    private Integer batteryPercent;
    private Integer signal;
    /** Primary vital type this device reports (HEART_RATE, STEPS, BLOOD_PRESSURE…). */
    private String metric;
    /** Stored hint; the dashboard derives the effective status from reading freshness. */
    private String status;
    private String lastSeen;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }
    public String getFirmware() { return firmware; }
    public void setFirmware(String firmware) { this.firmware = firmware; }
    public Integer getBatteryPercent() { return batteryPercent; }
    public void setBatteryPercent(Integer batteryPercent) { this.batteryPercent = batteryPercent; }
    public Integer getSignal() { return signal; }
    public void setSignal(Integer signal) { this.signal = signal; }
    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLastSeen() { return lastSeen; }
    public void setLastSeen(String lastSeen) { this.lastSeen = lastSeen; }
}
