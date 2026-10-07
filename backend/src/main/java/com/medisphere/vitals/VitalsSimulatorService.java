package com.medisphere.vitals;

import com.medisphere.monitoring.Device;
import com.medisphere.monitoring.DeviceRepository;
import com.medisphere.patient.Patient;
import com.medisphere.patient.PatientRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Deterministic-ish synthetic vital stream. This is the system's simulation
 * service: no real devices are involved, but readings are attributed to the
 * patient's actual seeded device document so device sync state on the
 * dashboard is derived from persisted timestamps.
 */
@Service
public class VitalsSimulatorService {
    private final PatientRepository patientRepository;
    private final DeviceRepository deviceRepository;
    private final VitalsService vitalsService;
    private final KafkaVitalsProducer kafkaProducer;
    private final boolean enabled;
    private final boolean kafkaEnabled;
    private final Random random = new Random();

    private static final Map<String, String> DEVICE_TYPE_BY_METRIC = Map.of(
            "HEART_RATE", "WEARABLE_WATCH",
            "TEMPERATURE", "WEARABLE_WATCH",
            "SPO2", "PULSE_OXIMETER",
            "RESP_RATE", "PULSE_OXIMETER",
            "GLUCOSE", "GLUCOSE_MONITOR",
            "BLOOD_PRESSURE", "BP_CUFF",
            "STEPS", "FITNESS_TRACKER");

    public VitalsSimulatorService(PatientRepository patientRepository, DeviceRepository deviceRepository,
                                  VitalsService vitalsService, KafkaVitalsProducer kafkaProducer,
                                  @Value("${medisphere.simulator.enabled}") boolean enabled,
                                  @Value("${medisphere.kafka.enabled}") boolean kafkaEnabled) {
        this.patientRepository = patientRepository;
        this.deviceRepository = deviceRepository;
        this.vitalsService = vitalsService;
        this.kafkaProducer = kafkaProducer;
        this.enabled = enabled;
        this.kafkaEnabled = kafkaEnabled;
    }

    @Scheduled(fixedRateString = "${medisphere.simulator.interval-ms:15000}")
    public void tick() {
        if (!enabled) return;
        List<Patient> patients = patientRepository.findAll();
        if (patients.isEmpty()) return;
        Patient p = patients.get(random.nextInt(patients.size()));
        String[] types = {"HEART_RATE", "SPO2", "TEMPERATURE", "GLUCOSE", "RESP_RATE", "BLOOD_PRESSURE", "STEPS"};
        String type = types[random.nextInt(types.length)];
        double value = switch (type) {
            case "HEART_RATE" -> 60 + random.nextInt(60);
            case "SPO2" -> 88 + random.nextInt(12);
            case "TEMPERATURE" -> 36.0 + random.nextDouble() * 3.0;
            case "GLUCOSE" -> 70 + random.nextInt(160);
            case "RESP_RATE" -> 12 + random.nextInt(12);
            case "BLOOD_PRESSURE" -> 100 + random.nextInt(70);
            case "STEPS" -> 1500 + random.nextInt(7000);
            default -> 0;
        };
        VitalReading v = new VitalReading();
        v.setPatientId(p.getId());
        v.setType(type);
        v.setValue(Math.round(value * 10.0) / 10.0);
        v.setUnit(unitFor(type));
        String deviceId = deviceIdFor(p.getId(), type);
        // Devices that are seeded offline stay silent — that is what the dashboard's
        // connectivity panel reports on, so the simulator must not resurrect them.
        if (deviceId == null) return;
        v.setDeviceId(deviceId);
        kafkaProducer.publish("patient.vitals", Map.of(
                "patientId", v.getPatientId(), "type", v.getType(), "value", v.getValue(), "unit", v.getUnit(), "deviceId", v.getDeviceId()));
        // When Kafka is enabled the listener ingests; otherwise ingest directly for the demo
        if (!kafkaEnabled) {
            vitalsService.ingest(v);
        }
    }

    /**
     * Attribute the simulated reading to the patient's device that reports this
     * metric, or {@code null} when that device is deliberately offline.
     */
    private String deviceIdFor(String patientId, String type) {
        try {
            String deviceType = DEVICE_TYPE_BY_METRIC.get(type);
            if (deviceType != null) {
                List<Device> matches = deviceRepository.findByPatientIdAndType(patientId, deviceType);
                if (!matches.isEmpty()) {
                    Device d = matches.get(0);
                    return "ONLINE".equals(d.getStatus()) ? d.getId() : null;
                }
            }
            List<Device> any = deviceRepository.findByPatientId(patientId);
            if (!any.isEmpty()) return any.get(0).getId();
        } catch (Exception ignored) {
            // fall through to the synthetic identifier below
        }
        return "sim-device-" + (1 + random.nextInt(4));
    }

    private String unitFor(String type) {
        return switch (type) {
            case "HEART_RATE" -> "bpm";
            case "SPO2" -> "%";
            case "TEMPERATURE" -> "C";
            case "GLUCOSE" -> "mg/dL";
            case "RESP_RATE" -> "breaths/min";
            case "BLOOD_PRESSURE" -> "mmHg";
            case "STEPS" -> "steps";
            default -> "";
        };
    }
}
