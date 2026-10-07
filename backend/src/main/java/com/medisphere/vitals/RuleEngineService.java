package com.medisphere.vitals;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RuleEngineService {

    public record AlertCandidate(String type, String severity, double value, double threshold, String message, double confidence) {}

    public AlertCandidate evaluate(VitalReading v) {
        return switch (v.getType()) {
            case "HEART_RATE" -> {
                if (v.getValue() > SettingsController.heartRateCritical)
                    yield new AlertCandidate("TACHYCARDIA", "CRITICAL", v.getValue(), SettingsController.heartRateCritical, "Heart rate above configured critical threshold", 0.92);
                if (v.getValue() > SettingsController.heartRateUpper)
                    yield new AlertCandidate("ELEVATED_HEART_RATE", "HIGH", v.getValue(), SettingsController.heartRateUpper, "Heart rate above elevated threshold", 0.80);
                if (v.getValue() < 45)
                    yield new AlertCandidate("BRADYCARDIA", "HIGH", v.getValue(), 45, "Heart rate below lower threshold", 0.78);
                yield null;
            }
            case "SPO2" -> v.getValue() < SettingsController.spo2Lower
                    ? new AlertCandidate("LOW_OXYGEN", "CRITICAL", v.getValue(), SettingsController.spo2Lower, "Oxygen saturation below critical threshold", 0.95)
                    : (v.getValue() < SettingsController.spo2Borderline ? new AlertCandidate("BORDERLINE_OXYGEN", "MEDIUM", v.getValue(), SettingsController.spo2Borderline, "Oxygen saturation below target range", 0.7) : null);
            case "TEMPERATURE" -> v.getValue() > SettingsController.temperatureFever
                    ? new AlertCandidate("FEVER", "HIGH", v.getValue(), SettingsController.temperatureFever, "Temperature above fever threshold", 0.85)
                    : null;
            case "GLUCOSE" -> {
                if (v.getValue() > SettingsController.glucoseCritical)
                    yield new AlertCandidate("HYPERGLYCEMIA", "CRITICAL", v.getValue(), SettingsController.glucoseCritical, "Blood glucose markedly elevated", 0.9);
                if (v.getValue() > SettingsController.glucoseUpper)
                    yield new AlertCandidate("ELEVATED_GLUCOSE", "MEDIUM", v.getValue(), SettingsController.glucoseUpper, "Blood glucose above target range", 0.75);
                if (v.getValue() < 70)
                    yield new AlertCandidate("HYPOGLYCEMIA", "HIGH", v.getValue(), 70, "Blood glucose below target range", 0.85);
                yield null;
            }
            case "BLOOD_PRESSURE" -> v.getValue() > SettingsController.systolicCritical
                    ? new AlertCandidate("HYPERTENSIVE_CRISIS_RANGE", "CRITICAL", v.getValue(), SettingsController.systolicCritical, "Systolic blood pressure in crisis range", 0.88)
                    : (v.getValue() > SettingsController.systolicUpper ? new AlertCandidate("HYPERTENSION_RANGE", "MEDIUM", v.getValue(), SettingsController.systolicUpper, "Systolic blood pressure above target range", 0.72) : null);
            default -> null;
        };
    }

    public List<AlertCandidate> none() { return List.of(); }
}
