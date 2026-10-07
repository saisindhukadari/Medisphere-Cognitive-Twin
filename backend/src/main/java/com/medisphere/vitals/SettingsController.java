package com.medisphere.vitals;

import com.medisphere.audit.AuditService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    private final AuditService auditService;

    public SettingsController(AuditService auditService) { this.auditService = auditService; }

    // Configurable demo thresholds (not universal medical guidance)
    public static volatile double heartRateUpper = 100;
    public static volatile double heartRateCritical = 130;
    public static volatile double spo2Lower = 90;
    public static volatile double spo2Borderline = 94;
    public static volatile double glucoseUpper = 180;
    public static volatile double glucoseCritical = 250;
    public static volatile double temperatureFever = 38.3;
    public static volatile double systolicUpper = 140;
    public static volatile double systolicCritical = 160;
    public static volatile long simulatorIntervalMs = 15000;

    @GetMapping("/thresholds")
    public Map<String, Object> thresholds() {
        Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("heartRateUpper", heartRateUpper);
        map.put("heartRateCritical", heartRateCritical);
        map.put("spo2Lower", spo2Lower);
        map.put("spo2Borderline", spo2Borderline);
        map.put("glucoseUpper", glucoseUpper);
        map.put("glucoseCritical", glucoseCritical);
        map.put("temperatureFever", temperatureFever);
        map.put("systolicUpper", systolicUpper);
        map.put("systolicCritical", systolicCritical);
        map.put("intervalMs", simulatorIntervalMs);
        map.put("disclaimer", "Thresholds are configurable and vary by patient population.");
        return map;
    }

    @org.springframework.web.bind.annotation.PostMapping("/thresholds")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
    public Map<String, Object> updateThresholds(@RequestBody Map<String, Object> body) {
        heartRateUpper = num(body, "heartRateUpper", heartRateUpper);
        heartRateCritical = num(body, "heartRateCritical", heartRateCritical);
        spo2Lower = num(body, "spo2Lower", spo2Lower);
        spo2Borderline = num(body, "spo2Borderline", spo2Borderline);
        glucoseUpper = num(body, "glucoseUpper", glucoseUpper);
        glucoseCritical = num(body, "glucoseCritical", glucoseCritical);
        temperatureFever = num(body, "temperatureFever", temperatureFever);
        systolicUpper = num(body, "systolicUpper", systolicUpper);
        systolicCritical = num(body, "systolicCritical", systolicCritical);
        if (body.get("intervalMs") != null) simulatorIntervalMs = (long) num(body, "intervalMs", simulatorIntervalMs);
        auditService.log(com.medisphere.auth.CurrentUser.email(), com.medisphere.auth.CurrentUser.role(),
                "SETTINGS_THRESHOLDS_UPDATED", "Settings", "thresholds", "SUCCESS", String.valueOf(body.keySet()));
        return thresholds();
    }

    private static double num(Map<String, Object> body, String key, double fallback) {
        Object v = body.get(key);
        if (v == null) return fallback;
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(String.valueOf(v)); } catch (NumberFormatException e) { return fallback; }
    }
}
