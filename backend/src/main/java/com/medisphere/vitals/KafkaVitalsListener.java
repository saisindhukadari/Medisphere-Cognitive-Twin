package com.medisphere.vitals;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@ConditionalOnProperty(name = "medisphere.kafka.enabled", havingValue = "true")
public class KafkaVitalsListener {
    private final VitalsService vitalsService;

    public KafkaVitalsListener(VitalsService vitalsService) { this.vitalsService = vitalsService; }

    @KafkaListener(topics = "patient.vitals", groupId = "medisphere-vitals")
    public void onMessage(Map<String, Object> payload) {
        try {
            VitalReading v = new VitalReading();
            v.setPatientId(String.valueOf(payload.get("patientId")));
            v.setType(String.valueOf(payload.get("type")));
            v.setValue(Double.parseDouble(String.valueOf(payload.get("value"))));
            v.setUnit(String.valueOf(payload.getOrDefault("unit", "")));
            v.setDeviceId(String.valueOf(payload.getOrDefault("deviceId", "sim-device")));
            vitalsService.ingest(v);
        } catch (Exception ignored) {}
    }
}
